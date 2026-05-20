import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  /**
   * Triggers a file download from the specified path
   * @param path - The path to the file (e.g., '/files/ncss.zip')
   */
  downloadFile(path: string): void {
    const link = document.createElement('a');
    link.href = path;
    // Extract filename from path
    const filename = path.split('/').pop() || 'download';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
