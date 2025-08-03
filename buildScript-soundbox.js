const fs = require('fs');
const path = require('path');
const uglifyJS = require('uglify-js');
const { minify_sync } = require("terser");
const roadroller = require('roadroller');
const { exec } = require('child_process');

// Read the original HTML file
const htmlFilePath = process.argv[2];
if (!htmlFilePath) {
  console.error('Please provide the HTML file path as an argument.');
  return;
}

if (!fs.existsSync(htmlFilePath)) {
  console.error('The provided HTML file does not exist.');
  return;
}
const name = htmlFilePath.split(".")[0];
console.log(`Buildin ${name}`);

const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

console.log("Original html size:", htmlContent.length);

// Extract script contents using regular expressions
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
const scriptContents = [];
let updatedHtmlContent = htmlContent.replace(scriptRegex, (match, scriptContent) => {
  scriptContents.push(scriptContent.trim());
  return ''; // Remove the script tag from the original HTML
});

// Remove all development related blocks from script contents
// they start with  // -- dev start
// and end with // -- dev end
const devBlockRegex = /\/\/\s*--\s*dev\s*start[\s\S]*?\/\/\s*--\s*dev\s*end\s*(\r?\n)?/gi;
let updatedScript = scriptContents.join('\n');
let devBlocks = updatedScript.match(devBlockRegex);
if (devBlocks) {
  devBlocks.forEach((block, i) => {
    console.log(`Dev block #${i+1} to remove:\n---\n${block}\n---`);
  });
} else {
  console.log('No dev blocks found to remove.');
}
updatedScript = updatedScript.replace(devBlockRegex, '');

// Remove all the shadercode between //*-- comments
const shaderRegex = /\/\*--([\s\S]*?)\s*\/\/\*--/g;
const extractedShaderArr = [];
updatedScript = updatedScript.replace(shaderRegex, (match, content) => {
  extractedShaderArr.push(content.trim());
  return ''; // Remove the matched content from the original HTML
});

let extractedShader = extractedShaderArr.join("\n");
console.log("ExtractedShader size:", extractedShader.length);

// remove ${w} and ${h} this is to make the minifier to work properly
extractedShader = extractedShader.replace("${w}", `436`);
extractedShader = extractedShader.replace("${h}", `258`);

fs.writeFileSync("./4demo-shader.glsl", extractedShader, 'utf8');

// pack the shader 
exec(`npx webpack-glsl-minify ./4demo-shader.glsl --output sourceOnly --preserveUniforms --preserveVariables --preserveDefines -e min`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    //console.log(`stdout: ${stdout}`);
    //console.error(`stderr: ${stderr}`);

    let shaderContentMin = fs.readFileSync("./4demo-shader.glslmin", 'utf8');    

    console.log("Minified extractedShader:", shaderContentMin.length)

    // put random resolution values back.
    shaderContentMin = shaderContentMin.replace(`436`, "${w}");
    shaderContentMin = shaderContentMin.replace(`258`, "${h}");    

    updatedScript = updatedScript.replace("`/`", "`" + shaderContentMin + "`");     

    console.log("Orginal script size: ", updatedScript.length);
  

    //  Lets remove values from song data that can be undefined and short the song variables
    updatedScript = updatedScript.replaceAll("numChannels", "E");
    updatedScript = updatedScript.replaceAll("rowLen", "F");
    updatedScript = updatedScript.replaceAll("patternLen", "G");
    updatedScript = updatedScript.replaceAll("endPattern", "H");  
    updatedScript = updatedScript.replaceAll("songData", "s");  
    //updatedScript = updatedScript.replaceAll("128", "ma");  

    // we can now safely remove all empty effect arrays
    updatedScript = updatedScript.replaceAll("f: []}", "}");  
    updatedScript = updatedScript.replaceAll("f: []},", "},");              
   
    console.log("Song minified script: ", updatedScript.length);

    // Test to pack the code with uglify and terser and use the smaller one 
    const minifiedScriptUglify = uglifyJS.minify(updatedScript).code;    
    const minifiedScriptTenser = minify_sync(updatedScript,{ compress: {
      drop_console: true,
      passes: 25,
      ecma: 2020,
      hoist_funs: true,
      unsafe : true
    } }).code; 
    console.log("uglify:", minifiedScriptUglify.length, " vs tenser:", minifiedScriptTenser.length);
    const minifiedScript = minifiedScriptUglify.length <= minifiedScriptTenser.length ? minifiedScriptUglify : minifiedScriptTenser;
    //console.log("--", minifiedScript2);

    console.log("Minified script: ", minifiedScript.length);
    fs.writeFileSync("minifiedScript.js", minifiedScript, 'utf8');
       
    const packer = new roadroller.Packer([
      {
          data: minifiedScript,
          type: 'js',
          action: 'eval'          
      },
    ], {
      maxMemoryMB: 512,
    
     numAbbreviations: 0, // -Zab0
     dynamicModels: 0, // -Zdy0
     recipLearningRate: 930, // -Zlr1218
     modelMaxCount: 3, // -Zmc3
     modelRecipBaseCount: 55, // -Zmd40
     precision: 14, // -Zpr14s
     sparseSelectors: [ // -S
       0,1,2,3,6,7,13,14,25,109,217,322
      ],
      
    });   

    // run to optimize:
    // npx roadroller minifiedscript.js -o output.js -OO
    // Optimized
    // -Zab|--num-abbreviationss
    // -Zdy|--dynamic-models
    // -Zlr|--learning-rates
    // -Zmc3|--model-max-count
    // -Zmd|--model-base-divisorss
    // Zpr -precision
    // -S sparseSelectors
        
    // -Zab0 -Zdy0 -Zlr930 -Zmc3 -Zmd55 -Zpr14 -S0,1,2,3,6,7,13,14,25,109,217,322
    

    packer.optimize().then((val) =>{
      console.log("packer:", val);
      const { firstLine, secondLine } = packer.makeDecoder();
      console.log("firstLine", firstLine.length, "secondLine", secondLine.length, "total:",  firstLine.length+secondLine.length)
      //console.log(firstLine + secondLine);
      //console.log("updatedHtmlContent", updatedHtmlContent);
      const final = updatedHtmlContent + "<script>"+ firstLine + secondLine +"</script>";
      const buildFilePath = path.resolve(__dirname, name + '-build.html');
      fs.writeFileSync(buildFilePath, final, 'utf8');

      console.log('Build completed successfully:',buildFilePath,' size:', final.length);
    })
});