import ContentItem from './ContentItem'

const ContentSection = ({ 
  contents, 
  onCopyText, 
  onDeleteText, 
  onDeleteFile, 
  onStarText,
  onStarFile,
  onDownload,
  escapeHtml,
  formatFileSize,
  contentRef
}) => {
  return (
    <div className="content-section" ref={contentRef}>
      {[...contents.texts, ...contents.files]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(item => (
          <ContentItem
            key={item.id}
            item={item}
            onCopy={onCopyText}
            onDelete={'content' in item ? onDeleteText : onDeleteFile}
            onStar={'content' in item ? onStarText : onStarFile}
            onDownload={onDownload}
            escapeHtml={escapeHtml}
            formatFileSize={formatFileSize}
          />
        ))}
    </div>
  )
}

export default ContentSection 