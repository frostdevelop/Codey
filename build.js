const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const version = '1.3.3';

async function build() {
  let result = await esbuild.build({
    entryPoints: {
      'HTML': 'src/editor-html.js',
      'HTML-vim': 'src/editor-html-vim.js',
      'JS': 'src/editor-js.js',
      'JS-vim': 'src/editor-js-vim.js',
      'Rust': 'src/editor-rust.js',
      'Rust-vim': 'src/editor-rust-vim.js',
      'Java': 'src/editor-java.js',
      'Java-vim': 'src/editor-java-vim.js'
    },
    bundle: true,
    outdir: 'dist/js',
    write: false,
    minify: true,
    sourcemap: false,
  });
  
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  let htmlTemplate = fs.readFileSync('src/editor.html', 'utf8');
	
  for (let file of result.outputFiles) {
    let filename = path.basename(file.path);
    filename = filename.substring(0,filename.length-3);
	let newHtml = htmlTemplate;
	newHtml = newHtml.replaceAll('<!-- inject:version -->',version);
	newHtml = newHtml.replaceAll('<!-- inject:edition -->',filename);
	newHtml = newHtml.replace('<!-- inject:js -->',()=>file.text);
	fs.writeFileSync('dist/Codey_'+version+'_'+filename+'.html', newHtml);
  }
}

build().catch(() => process.exit(1));