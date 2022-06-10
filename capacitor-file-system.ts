import { io } from '@tensorflow/tfjs-core';
import { ModelArtifacts, ModelArtifactsInfo } from '@tensorflow/tfjs-core/src/io/types';
import { Filesystem, FilesystemEncoding } from '@capacitor/core';

export class CapacitorFileSystem implements io.IOHandler {
	protected readonly path: string;

	readonly MODEL_JSON_FILENAME = 'model.json';
	readonly WEIGHTS_BINARY_FILENAME = 'weights.bin';

	constructor(path: string) {
		this.path = path;
	}

	async save(modelArtifacts: io.ModelArtifacts): Promise<io.SaveResult> {
		const weightsManifest = [{
			paths: [this.WEIGHTS_BINARY_FILENAME],
			weights: modelArtifacts.weightSpecs
		}];

		const modelJSON: io.ModelJSON = {
			modelTopology: modelArtifacts.modelTopology,
			weightsManifest,
			format: modelArtifacts.format,
			generatedBy: modelArtifacts.generatedBy,
			convertedBy: modelArtifacts.convertedBy
		};

		if (modelArtifacts.trainingConfig != null) {
			modelJSON.trainingConfig = modelArtifacts.trainingConfig;
		}

		if (modelArtifacts.userDefinedMetadata != null) {
			modelJSON.userDefinedMetadata = modelArtifacts.userDefinedMetadata;
		}
		
		try {
			await Filesystem.writeFile({
				path: this.path + '/' + this.MODEL_JSON_FILENAME,
				data: JSON.stringify(modelJSON),
				encoding: FilesystemEncoding.UTF8,
				recursive: true
			});
			
			// https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string#comment91519905_42334410
			const base64 = btoa(new Uint8Array(modelArtifacts.weightData).reduce((data, byte) => (data.push(String.fromCharCode(byte)), data), []).join(''));

			await Filesystem.writeFile({
				path: this.path + '/' + this.WEIGHTS_BINARY_FILENAME,
				data: base64,
				recursive: true
			});
		} catch(e) {
			console.log(e);
		}

		return { modelArtifactsInfo: (this.getModelArtifactsInfoForJSON(modelArtifacts) as any) };
	}

	getModelArtifactsInfoForJSON(modelArtifacts: ModelArtifacts): ModelArtifactsInfo {
		return {
			dateSaved: new Date(),
			modelTopologyType: 'JSON',
			modelTopologyBytes: modelArtifacts.modelTopology == null ? 0 : this.stringByteLength(JSON.stringify(modelArtifacts.modelTopology)),
			weightSpecsBytes: modelArtifacts.weightSpecs == null ? 0 : this.stringByteLength(JSON.stringify(modelArtifacts.weightSpecs)),
			weightDataBytes: modelArtifacts.weightData == null ? 0 : modelArtifacts.weightData.byteLength,
		};
	}

	stringByteLength(str: string): number {
		return new Blob([str]).size;
	}

	async load(): Promise<io.ModelArtifacts> {
		try {
			const modelText = await Filesystem.readFile({
				path: this.path + '/' + this.MODEL_JSON_FILENAME,
				encoding: FilesystemEncoding.UTF8
			});
			const modelJSON = JSON.parse(modelText.data);

			const modelArtifacts: io.ModelArtifacts = {
				modelTopology: modelJSON.modelTopology,
				format: modelJSON.format,
				generatedBy: modelJSON.generatedBy,
				convertedBy: modelJSON.convertedBy
			};

			if (modelJSON.weightsManifest != null) {
				const [weightSpecs, weightData] = await this.loadWeights(modelJSON.weightsManifest, this.path);
				modelArtifacts.weightSpecs = weightSpecs;
				modelArtifacts.weightData = weightData;
			}

			if (modelJSON.trainingConfig != null) {
				modelArtifacts.trainingConfig = modelJSON.trainingConfig;
			}

			if (modelJSON.userDefinedMetadata != null) {
				modelArtifacts.userDefinedMetadata = modelJSON.userDefinedMetadata;
			}

			return modelArtifacts;
		} catch(e) {
			console.log(e);
		}
	}

	private async loadWeights(weightsManifest: io.WeightsManifestConfig, path: string): Promise<[io.WeightsManifestEntry[], ArrayBuffer]> {
		const weightSpecs: io.WeightsManifestEntry[] = [];

		for (const group of weightsManifest) {
			weightSpecs.push(...group.weights);
		}
		
		const base64 = await Filesystem.readFile({
			path: path + '/' + this.WEIGHTS_BINARY_FILENAME
		});
		const arrayBuffer = this.base64ToArrayBuffer(base64.data);

		return [weightSpecs, arrayBuffer];
	}

	// https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
	base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary_string = atob(base64);
		const len = binary_string.length;
		const bytes = new Uint8Array(len);

		for (let i = 0; i < len; i++) {
			bytes[i] = binary_string.charCodeAt(i);
		}

		return bytes.buffer;
	}
}
