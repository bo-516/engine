/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
import { AudioClip } from '../../audio/assets/clip';
import { ImageAsset, JsonAsset, TextAsset, TTFFont, Asset } from '../assets';
import { BufferAsset } from '../assets/buffer-asset';
import { legacyCC } from '../global-exports';
import { js } from '../utils/js';
import Bundle, { resources } from './bundle';
import Cache from './cache';
import { IConfigOption } from './config';
import { assets, BuiltinBundleName, bundles, CompleteCallback, IRemoteOptions } from './shared';
import { IDownloadParseOptions } from './shared';
import { cache } from './utilities';

export type CreateHandler = (id: string, data: any, options: IDownloadParseOptions, onComplete: CompleteCallback<Asset|Bundle>) => void;

function createTexture (id: string, data: HTMLImageElement, options: IDownloadParseOptions, onComplete: CompleteCallback<ImageAsset>) {
    let out: ImageAsset | null = null;
    let err = null;
    try {
        out = new ImageAsset();
        out._nativeUrl = id;
        out._nativeAsset = data;
    }
    catch (e) {
        err = e;
    }
    onComplete(err, out);
}

function createAudioClip (id: string, data: HTMLAudioElement | AudioBuffer, options: IDownloadParseOptions, onComplete: CompleteCallback<AudioClip>) {
    const out = new AudioClip();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createJsonAsset (id: string, data: Record<string, any>, options: IDownloadParseOptions, onComplete: CompleteCallback<JsonAsset>) {
    const out = new JsonAsset();
    out.json = data;
    onComplete(null, out);
}

function createTextAsset (id: string, data: string, options: IDownloadParseOptions, onComplete: CompleteCallback<TextAsset>) {
    const out = new TextAsset();
    out.text = data;
    onComplete(null, out);
}

function createFont (id: string, data: string, options: IDownloadParseOptions, onComplete: CompleteCallback<TTFFont>) {
    const out = new TTFFont();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createBufferAsset (id: string, data: ArrayBufferView, options: IDownloadParseOptions, onComplete: CompleteCallback<BufferAsset>) {
    const out = new BufferAsset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createAsset (id: string, data: any, options: IDownloadParseOptions, onComplete: CompleteCallback<Asset>) {
    const out = new Asset();
    out._nativeUrl = id;
    out._nativeAsset = data;
    onComplete(null, out);
}

function createBundle (id: string, data: IConfigOption, options, onComplete) {
    let bundle = bundles.get(data.name);
    if (!bundle) {
        bundle = data.name === BuiltinBundleName.RESOURCES ? resources : new Bundle();
        data.base = data.base || id + '/';
        bundle.init(data);
    }
    onComplete(null, bundle);
}

export class Factory {

    private _creating = new Cache<CompleteCallback[]>();

    private _producers: Record<string, CreateHandler> = {
        // Images
        '.png' : createTexture,
        '.jpg' : createTexture,
        '.bmp' : createTexture,
        '.jpeg' : createTexture,
        '.gif' : createTexture,
        '.ico' : createTexture,
        '.tiff' : createTexture,
        '.webp' : createTexture,
        '.image' : createTexture,
        '.pvr': createTexture,
        '.pkm': createTexture,

        // Audio
        '.mp3' : createAudioClip,
        '.ogg' : createAudioClip,
        '.wav' : createAudioClip,
        '.m4a' : createAudioClip,

        // Txt
        '.txt' : createTextAsset,
        '.xml' : createTextAsset,
        '.vsh' : createTextAsset,
        '.fsh' : createTextAsset,
        '.atlas' : createTextAsset,

        '.tmx' : createTextAsset,
        '.tsx' : createTextAsset,
        '.fnt' : createTextAsset,

        '.json' : createJsonAsset,
        '.ExportJson' : createJsonAsset,

        // font
        '.font' : createFont,
        '.eot' : createFont,
        '.ttf' : createFont,
        '.woff' : createFont,
        '.svg' : createFont,
        '.ttc' : createFont,

        // Binary
        '.binary': createBufferAsset,
        '.bin': createBufferAsset,
        '.dbbin': createBufferAsset,
        '.skel': createBufferAsset,

        'bundle': createBundle,

        'default': createAsset,

    };

    public register (type: string | Record<string, CreateHandler>, handler?: CreateHandler): void {
        if (typeof type === 'object') {
            js.mixin(this._producers, type);
        }
        else {
            this._producers[type] = handler!;
        }
    }

    public create (id: string, data: any, type: string, options: IRemoteOptions, onComplete: CompleteCallback<Asset | Bundle>): void {
        const handler = this._producers[type] || this._producers.default;
        const asset = assets.get(id);
        if (!options.reloadAsset && asset) {
            return onComplete(null, asset);
        }
        const creating = this._creating.get(id);
        if (creating) {
            creating.push(onComplete);
            return;
        }

        this._creating.add(id, [onComplete]);
        handler(id, data, options, (err, result) => {
            if (!err && result instanceof Asset) {
                result._uuid = id;
                if (options.cacheAsset) {
                    cache(id, result, options.cacheAsset);
                }
            }
            const callbacks = this._creating.remove(id);
            for (let i = 0, l = callbacks!.length; i < l; i++) {
                callbacks![i](err, data);
            }
        });
    }
}

export default new Factory();
