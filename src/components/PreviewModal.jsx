import React, { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';

const PreviewModal = ({ isOpen, onClose, editor, versionId }) => {
    const previewRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [orientation, setOrientation] = useState('portrait');

    if (!isOpen || !editor) return null;

    const content = editor.getHTML();

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <html>
        <head>
          <title>Print Document</title>
          <style>
            @page { margin: 20mm; size: auto; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                padding: 0; 
                margin: 0;
                color: #000;
            }
            .tiptap { 
                line-height: 1.6; 
                font-size: 12pt;
                max-width: 100%;
            }
            
            /* Table Print Styles */
            table { 
                border-collapse: collapse; 
                width: 100%; 
                margin: 1.5em 0;
                page-break-inside: auto;
            }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { 
                border: 1px solid #000; 
                padding: 8px 12px; 
                text-align: left; 
                vertical-align: top;
            }
            th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold; }
            
            /* Hide UI Elements */
            [block-id]::before { display: none !important; }
            [block-id] { border: none !important; padding-left: 0 !important; }
            
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="tiptap">${content}</div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                  window.print();
                  window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    const handleExportPDF = () => {
        const element = previewRef.current;
        const opt = {
            margin: 15,
            filename: `Document-${versionId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleExportWord = () => {
        // MS Word HTML Parsing requires explicit inline styles and borders for tables
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        const tables = doc.querySelectorAll('table');
        tables.forEach(table => {
            table.setAttribute('border', '1');
            table.setAttribute('cellpadding', '8');
            table.setAttribute('cellspacing', '0');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            table.style.marginBottom = '20px';

            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
                cell.style.textAlign = 'left';
            });

            const headers = table.querySelectorAll('th');
            headers.forEach(th => {
                th.style.backgroundColor = '#f3f4f6';
                th.style.fontWeight = 'bold';
            });
        });

        // Hide block IDs on export
        doc.querySelectorAll('[block-id]').forEach(el => {
            el.removeAttribute('block-id');
        });

        const modifiedContent = doc.body.innerHTML;

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Export Word</title>" +
            "<style>body { font-family: Arial, sans-serif; }</style>" +
            "</head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + modifiedContent + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `Document-${versionId}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    return (
        <div className="link-modal-overlay" onClick={onClose}>
            <div className="link-modal preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="link-modal-header">
                    <h3>Print Preview & Export</h3>
                    <button type="button" className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="preview-toolbar">
                    <div className="toolbar-group">
                        <label>Orientation:</label>
                        <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                    <div className="toolbar-group">
                        <label>Zoom:</label>
                        <input
                            type="range" min="0.5" max="1.5" step="0.1"
                            value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <div className="preview-content-wrapper">
                    <div
                        ref={previewRef}
                        className={`preview-page-container ${orientation}`}
                        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                    >
                        <div className="tiptap preview-content" dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                </div>

                <div className="link-modal-footer">
                    <button type="button" className="cancel-btn" onClick={handlePrint}>Print</button>
                    <button type="button" className="ok-btn word-btn" onClick={handleExportWord}>Export Word</button>
                    <button type="button" className="ok-btn" onClick={handleExportPDF}>Export PDF</button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
