const { execSync } = require('child_process');
const fs = require('fs');

/**
 * 获取 macOS 剪贴板中的文件路径列表（方法1：AppleScript）
 */
function getMacOSFilePathsAppleScript() {
	try {
		const script = `
			tell application "Finder"
				try
					set theItems to (the clipboard as «class furl»)
					if theItems is not missing value then
						set thePaths to {}
						if (class of theItems) is list then
							repeat with anItem in theItems
								set thePath to POSIX path of (contents of anItem)
								copy thePath to end of thePaths
							end repeat
						else
							set thePath to POSIX path of (contents of theItems)
							copy thePath to end of thePaths
						end if
						return thePaths
					end if
				on error
					return ""
				end try
			end tell
		`;

		const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'ignore'],
			timeout: 5000
		});

		if (result && result.trim()) {
			const paths = result.trim().split(', ').map(p => p.trim()).filter(p => p);
			return paths;
		}
		return [];
	} catch (error) {
		return [];
	}
}

/**
 * 获取 macOS 剪贴板中的文件路径列表（方法2：使用 JXA）
 */
function getMacOSFilePathsJXA() {
	try {
		const script = `
			var app = Application('Finder');
			app.includeStandardAdditions = true;
			var clipboard = app.getTheClipboard({as: 'furl'});
			if (clipboard) {
				var paths = [];
				if (Array.isArray(clipboard)) {
					clipboard.forEach(function(item) {
						paths.push(item.posixPath());
					});
				} else {
					paths.push(clipboard.posixPath());
				}
				return paths.join('\\n');
			}
			return '';
		`;

		const result = execSync(`osascript -l JavaScript -e '${script.replace(/'/g, "\\'")}'`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'ignore'],
			timeout: 5000
		});

		if (result && result.trim()) {
			return result.trim().split('\n').map(p => p.trim()).filter(p => p);
		}
		return [];
	} catch (error) {
		return [];
	}
}

/**
 * 获取 macOS 剪贴板中的文件路径列表
 */
function getMacOSFilePaths() {
	let paths = getMacOSFilePathsJXA();
	if (paths.length > 0) {
		return paths;
	}

	paths = getMacOSFilePathsAppleScript();
	if (paths.length > 0) {
		return paths;
	}

	return [];
}

function getWindowsFilePaths() {
    try {
        // 使用单行 PowerShell 命令
        const result = execSync(
            `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::GetFileDropList()"`,
            { 
                encoding: 'utf-8', 
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            }
        );
        
        if (result && result.trim()) {
            const paths = result.trim().split('\r\n')
                .map(p => p.trim())
                .filter(p => p && fs.existsSync(p) && fs.statSync(p).isFile());
            if (paths.length > 0) {
                return paths;
            }
        }
        return [];
    } catch (error) {
        console.error('获取剪贴板文件失败:', error.message);
        return [];
    }
}

/**
 * 获取剪贴板内容（跨平台）
 * @returns {{files: string[], text: string|null}}
 */
function getClipboardContent() {
	let files = [];
	let text = null;
	const { clipboard } = require('electron');
	const fs = require('fs');

	// macOS: 尝试获取文件路径
	if (process.platform === 'darwin') {
		files = getMacOSFilePaths();
	}else if(process.platform === 'win32'){
		files = getWindowsFilePaths()
	}

	// 验证文件是否真实存在
	files = files.filter(filePath => {
		try {
			return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
		} catch {
			return false;
		}
	});

	// 如果 macOS 方法没找到文件，或其他平台，尝试 Electron API
	if (files.length === 0) {
		const fileUrl = clipboard.read('public.file-url')
		if (fileUrl) {
			let filePath = fileUrl;
			if (filePath.startsWith('file:///')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\/\/+/, '/'));
			} else if (filePath.startsWith('file://')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\/+/, ''));
			} else if (filePath.startsWith('file:')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\//, '/'));
			}
			// 过滤 macOS 内部文件 ID
			if (filePath && !filePath.startsWith('/.file/') && !filePath.includes('.file/id=')) {
				// 验证文件是否存在
				if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
					files = [filePath];
				}
			}
		}
	}

	// 获取文本内容
	if (files.length === 0) {
		text = clipboard.readText();
	}

	return { files, text };
}

module.exports = {
	getMacOSFilePathsAppleScript,
	getMacOSFilePathsJXA,
	getMacOSFilePaths,
	getClipboardContent
};
