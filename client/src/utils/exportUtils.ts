import html2canvas from 'html2canvas';

export async function exportCanvasAsPng(
  element: HTMLElement,
  filename: string = 'evidence-board.png'
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export canvas as PNG');
  }
}

export async function exportCanvasAsBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch (error) {
    console.error('Export failed:', error);
    return null;
  }
}

export function formatExportFilename(prefix: string = 'evidence-board'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.png`;
}

export async function copyToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const blob = await exportCanvasAsBlob(element);
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);

    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}
