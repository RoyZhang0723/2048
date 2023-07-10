import { AudioClip, AudioSource, Component, resources, _decorator } from "cc";

const { ccclass, requireComponent } = _decorator;

@ccclass
@requireComponent(AudioSource)
export default class AudioManager extends Component {
    #audioSource: AudioSource;
    #cacheAudioMap: Map<string, AudioClip>;

    onLoad() {
        this.#audioSource = this.getComponent(AudioSource);
        this.#cacheAudioMap = new Map();
    }

    playAudio(name: string) {
        this.#getAudioClip(name).then(clip => {
            this.#audioSource.playOneShot(clip);
        }, error => {
            console.error(error);
        });
    }

    #getAudioClip(name: string): Promise<AudioClip> {
        if (this.#cacheAudioMap.has(name)) {
            return Promise.resolve(this.#cacheAudioMap.get(name));
        }

        return new Promise<AudioClip>((resolve, reject) => {
            resources.load('audios/' + name, AudioClip, (error, asset) => {
                if (!error && asset) {
                    asset.addRef();
                    this.#cacheAudioMap.set(name, asset);

                    resolve(asset);
                } else {
                    reject(error);
                }
            });
        });
    }
}
