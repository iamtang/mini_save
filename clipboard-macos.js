const { execSync } = require('child_process');

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
 * JXA (JavaScript for Automation) 是 macOS 的另一种自动化方式
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
 * 获取 macOS 剪贴板中的文件路径列表（方法3：使用 pasteboard CLI）
 * 使用 objc 命令直接调用 macOS API
 */
function getMacOSFilePathsPasteboard() {
	try {
		// 先检查是否有 pbpaste-pasteboard 命令
		execSync('which pbpaste', { stdio: 'ignore' });

		// 尝试获取剪贴板类型
		const types = execSync('pbpaste -pboard general - Prefer txt', {
			encoding: 'utf-8',
			stdio: 'ignore'
		});

		// 这个方法通常不返回文件路径，主要用于文本
		return [];
	} catch (error) {
		return [];
	}
}

/**
 * 获取 macOS 剪贴板中的文件路径列表
 * 按优先级尝试多种方法
 */
function getMacOSFilePaths() {
	// 优先尝试 JXA 方法（通常更可���）
	let paths = getMacOSFilePathsJXA();
	if (paths.length > 0) {
		return paths;
	}

	// 回退到 AppleScript 方法
	paths = getMacOSFilePathsAppleScript();
	if (paths.length > 0) {
		return paths;
	}

	return [];
}

/**
 * 获取剪贴板内容（跨平台）
 * @returns {{files: string[], text: string|null}}
 */
function getClipboardContent() {
	let files = [];
	let text = null;
	const { clipboard } = require('electron');

	// macOS: 尝试获取文件路径
	if (process.platform === 'darwin') {
		files = getMacOSFilePaths();
	}

	// 如果 macOS 方法没找到文件，或其他平台，尝试 Electron API
	if (files.length === 0) {
		const fileUrl = clipboard.read('public.file-url');
		if (fileUrl) {
			let filePath = fileUrl;
			// 处理不同的 file URL 格式
			if (filePath.startsWith('file:///')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\/\/+/, '/'));
			} else if (filePath.startsWith('file://')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\/+/, ''));
			} else if (filePath.startsWith('file:')) {
				filePath = decodeURIComponent(filePath.replace(/^file:\//, '/'));
			}
			// 过滤 macOS 内部文件 ID
			if (filePath && !filePath.startsWith('/.file/') && !filePath.includes('.file/id=')) {
				files = [filePath];
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
