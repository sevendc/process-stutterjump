# 4kdemo - Process Stutterjump

A WebGL-based 4k demo created for Assembly 2025. This demo combines procedural graphics with synchronized music in under 4 kilobytes. 

## Features

- WebGL shader-based graphics with animated effects and camera movements
- Synchronized music using SoundBox
- Interactive start with click-to-play
- Golfed and minimized bootsrap fo a shader and a music. Empty shader & and music without speech synthesis is 2757 bytes.

## Quick Start

1. Open `demo.html` in a modern web browser (Chrome/Firefox recommended)
2. Click anywhere to start the demo
3. Enjoy the audiovisual experience!

## Development Guide

### Project Structure

- `demo.html` - Main demo file containing graphics and music code
- `buildScript-soundbox.js` - Build script for optimization
- `package.json` - Project dependencies

### Development Code

During development, you can include debug code that will be stripped in the final build using special comments:

```js
// -- dev start
if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
    console.log(g.getShaderInfoLog(s));
    alert('shader compilation error: ' + g.getShaderInfoLog(s));
}
// -- dev end
```

### Shader Code

GLSL shader code should be placed between special comments:

```glsl
//*--
    ...shadercode here
//*--
```

Use only the time (uniform float t;) as a input in the shader.

### Music

The demo uses SoundBox for music generation. Music data is defined in the `song` object within `demo.html`. You can use [SoundBox](http://sb.bitsnbites.eu/) to create and edit the music.

## Building

1. Install dependencies:
```bash
npm install
```

2. Create the final build:
```bash
npm run build
```

This will:
- Minify the shader code
- Optimize JavaScript using UglifyJS/Terser
- Pack everything using Roadroller
- Create `demo-build.html` ready for distribution

## Optimization Guide

The build process involves multiple stages of optimization to achieve the smallest possible file size. Before optimizing, always build the demo first to generate the necessary intermediate files:

```bash
npm run build
```

### Build Process Steps

1. **Shader Minification**
   - Shaders are extracted from between `//*--` comments
   - Processed using webpack-glsl-minify with options:
     - `--preserveUniforms`: Keeps uniform variable names
     - `--preserveVariables`: Maintains critical variable names
     - `--preserveDefines`: Keeps #define statements

2. **JavaScript Optimization**
   - Development code (between `// -- dev start` and `// -- dev end`) is stripped
   - Both UglifyJS and Terser are used, with the smaller output being chosen
   - Terser options:
     ```json
     {
       "compress": {
         "drop_console": true,
         "passes": 25,
         "ecma": 2020,
         "hoist_funs": true,
         "unsafe": true
       }
     }
     ```

3. **Roadroller Packing**
   The final step uses Roadroller with these optimized parameters:
   ```js
   {
     maxMemoryMB: 512,
     numAbbreviations: 0,    // -Zab0
     dynamicModels: 0,       // -Zdy0
     recipLearningRate: 930, // -Zlr930
     modelMaxCount: 3,       // -Zmc3
     modelRecipBaseCount: 55,// -Zmd55
     precision: 14,          // -Zpr14
     sparseSelectors: [0,1,2,3,6,7,13,14,25,109,217,322] // -S
   }
   ```

   These parameters are only for this demo. remove the values when working with your demo.

   To further optimize using Roadroller manually:
   1. First build the demo to generate `minifiedScript.js`
   2. Then run Roadroller's optimizer:
   ```bash
   npx roadroller minifiedScript.js -o output.js -OO
   ```

   Command-line optimization flags:
   ```
   -Zab0  # Number of abbreviations (0 for our case)
   -Zdy0  # Dynamic models (0 for our case)
   -Zlr930  # Learning rate (930 gives best results)
   -Zmc3  # Model max count (3 for balance)
   -Zmd55  # Model base divisors (55 for our use)
   -Zpr14  # Precision (14 bits)
   -S0,1,2,3,6,7,13,14,25,109,217,322  # Optimized sparse selectors
   ```

   Complete optimization command:
   ```bash
   npx roadroller minifiedScript.js -o output.js -Zab0 -Zdy0 -Zlr930 -Zmc3 -Zmd55 -Zpr14 -S0,1,2,3,6,7,13,14,25,109,217,322
   ```

### Optimization Tips

1. **Shader Optimization**
   - Minimize uniform variable usage
   - Use #define for repeated calculations
   - Combine similar operations
   - Use vec3/vec4 operations instead of individual components

2. **JavaScript Optimization**
   - Use short variable names consistently
   - Combine similar functions
   - Remove unused code
   - Use ternary operators instead of if-else where possible

3. **Size Monitoring**
   - Track generated file sizes:
     - `4demo-shader.glslmin`: Minified shader
     - `minifiedScript.js`: Optimized JavaScript
     - `demo-build.html`: Final packed demo

### Generated Files
The following files are created during build (and git-ignored):
```
node_modules/
demo-build.html
minifiedScript.js
output.js
4demo-shader.glsl
4demo-shader.glslmin
```

## Optimization Tools

The build process uses several tools for extreme size optimization:

- [webpack-glsl-minify](https://www.npmjs.com/package/webpack-glsl-minify) - For shader optimization
- [UglifyJS](https://www.npmjs.com/package/uglify-js) & [Terser](https://www.npmjs.com/package/terser) - JavaScript minification
- [Roadroller](https://github.com/lifthrasiir/roadroller) - Advanced JavaScript packing
  - Online version: https://lifthrasiir.github.io/roadroller/

## Inspiration

Check these amazing ShaderToy demos that inspired this project:

- [Fractal Land](https://www.shadertoy.com/view/lcSSDV)
- [Dusty Nebula](https://www.shadertoy.com/view/Xtlyzl)
- [The Universe Within](https://www.shadertoy.com/view/4s3SRN)

## Contributing

Feel free to experiment with the shader code and music. Remember to keep optimizations in mind as we need to stay under 4KB!
