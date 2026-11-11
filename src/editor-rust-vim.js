import { EditorView, basicSetup } from "codemirror";
import { rust } from "@codemirror/lang-rust";
import { xcodeLight } from '@uiw/codemirror-theme-xcode';
import { vim } from "@replit/codemirror-vim";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

const supportsFileSystemAccess = 'showOpenFilePicker' in window;
let currentFileHandle;

const codeyKeys = Prec.highest(
  keymap.of([
    {
      key: "Mod-s",
      run: (view) => {  
		saveFile();
        return true;
      }
    },
    {
      key: "Mod-o",
      run: async (view) => {
		if(supportsFileSystemAccess){
			const [handle] = await window.showOpenFilePicker({
				multiple: false,
				types: [{
					description: 'Text Files & Source Code',
					accept: {
						'text/plain': ['.txt', '.js','.rs',  '.json', '.html', '.css', '.md', '.py', '.ts']
					}
				}]
			});
			currentFileHandle = handle;
			await verifyPermission(handle);
			const file = await handle.getFile();
			const text = await file.text();
			
			view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text}});
			showStatus(handle.name);
		}else{
			fileInput.click();
		}
        return true;
      }
    },
    {
      key: "Mod-.",
      run: (view) => {
		showStatus(setFontSize(fontSize+1));
        return true;
      }
    },
    {
      key: "Mod-,",
      run: (view) => {
		showStatus(setFontSize(fontSize-1));
        return true;
      }
    }
  ])
);

async function verifyPermission(fileHandle, readWrite = true) {
	const options = { mode: readWrite ? 'readwrite' : 'read' };
	if ((await fileHandle.queryPermission(options)) === 'granted') {
		return true;
	}
	if ((await fileHandle.requestPermission(options)) === 'granted') {
		return true;
	}
	return false;
}

async function saveFile(){
	if(supportsFileSystemAccess){
		if(!currentFileHandle){
			try {
				const newHandle = await window.showSaveFilePicker({
					suggestedName: 'codey-export.rs',
					types: [{
						description: 'Text File',
						accept: { 'text/plain': ['.txt','.rs',  '.md', '.json', '.js', '.html'] }
					}]
				});
				currentFileHandle = newHandle;
			} catch (e) {
				return;
			}
		}						
		try {
			if (!(await verifyPermission(currentFileHandle))) {
				showStatus('Permission to write file denied.');
				return;
			}

			const writable = await currentFileHandle.createWritable();
			await writable.write(view.state.doc.toString());
			await writable.close();
			
			showStatus('Changes saved.');
		} catch (err) {
			showStatus('Error saving file: ' + err.message);
		}
	}else{
		const d = document.createElement('a');d.download = 'codey-export.rs';d.href = URL.createObjectURL(new Blob([view.state.doc.toString()]));d.click();d.remove();URL.revokeObjectURL(d.href);
	}
}

let autosaveTimeout = null;
const autosaveListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
	clearTimeout(autosaveTimeout);
	autosaveTimeout = setTimeout(saveFile,2000);
  }
});

const view = new EditorView({
  doc: `fn main() {
    println!("Frostbyte is so cool");
}`,
  extensions: [
	basicSetup,
	rust(),
	xcodeLight,
	vim(),
	autosaveListener,
	codeyKeys
  ],
  parent: document.getElementById('editor')
});
view.focus();

let statusTimeout=null;
function showStatus(text){
	statusOverlay.textContent = text;
	statusOverlay.classList.add('statusOverlay--showing');
	clearTimeout(statusTimeout);
	statusTimeout=setTimeout(()=>statusOverlay.classList.remove('statusOverlay--showing'),2000);
}

const editorElement = document.getElementsByClassName('cm-editor')[0];
const statusOverlay = document.getElementById('statusOverlay');
const fileInput = document.getElementById('fileUploadInput');

let fontSize = 12;
const isLocalStorageSupported = 'localStorage' in window;
function setFontSize(size){
	fontSize = size;
	editorElement.style.fontSize = fontSize.toString() + 'px';
	isLocalStorageSupported && localStorage.setItem('codey.pref.fontSize',fontSize);
	return editorElement.style.fontSize;
}
document.addEventListener('mousemove',e=>{
	if(e.ctrlKey && e.altKey){
		showStatus(setFontSize(fontSize-e.movementY/10));
	}
});

if(isLocalStorageSupported){
		const savedFontSize = localStorage.getItem('codey.pref.fontSize');
		if(savedFontSize){
			setFontSize(parseInt(savedFontSize));
		}else{
			setFontSize(fontSize);
		}
}else{
	setFontSize(fontSize);
}

fileInput.addEventListener('change',e=>{
	const fr = new FileReader;
	fr.onload = ()=>{view.dispatch({changes:{from:0,to:view.state.doc.length,insert:fr.result}})};
	fr.readAsText(e.target.files[0]);
});

onbeforeunload=()=>{
	saveFile();
	return 1;
};