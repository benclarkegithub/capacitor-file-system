# Capacitor File System

Custom IOHandler for [TensorFlow.js](https://github.com/tensorflow/tfjs) that uses [Capacitor's File System](https://capacitorjs.com/docs/apis/filesystem).
Based on [https://www.tensorflow.org/js/guide/save_load](https://www.tensorflow.org/js/guide/save_load).

## Example Usage

```ts
import * as tf from '@tensorflow/tfjs';

// Load
const customFileSystem = new CapacitorFileSystem(modelReference);
this.userModel = await tf.loadLayersModel(customFileSystem);

// Save
const customFileSystem = new CapacitorFileSystem(modelReference);
model.save(customFileSystem);
```

Where `modelReference` is a valid path accepted by Capacitor's File System plugin.
