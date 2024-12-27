import ContentItem from './ContentItem'

const ContentSection = ({ 
  contents, 
  onCopyText, 
  onDeleteText, 
  onDeleteFile, 
  onDownload,
  escapeHtml,
  formatFileSize,
  contentRef 
}) => {
  return (
    <div className="content-section" ref={contentRef}>
      {[...contents.texts, ...contents.files]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(item => (
          <ContentItem
            key={item.id}
            item={item}
            onCopy={onCopyText}
            onDelete={'content' in item ? onDeleteText : onDeleteFile}
            onDownload={onDownload}
            escapeHtml={escapeHtml}
            formatFileSize={formatFileSize}
          />
        ))}
    </div>
  )
}

export default ContentSection 