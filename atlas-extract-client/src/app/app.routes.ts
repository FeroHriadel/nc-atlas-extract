import { Routes } from '@angular/router';
import { uploadActiveGuard } from './guards/upload-active.guard';
import { HomePage } from './pages/home/home.page';
import { SourcesPage } from './pages/sources/sources.page';
import { SourcesUploadPage } from './pages/sources-upload/sources-upload.page';
import { ExtractDataPage } from './pages/extract-data/extract-data.page';
import { InitExtractionPage } from './pages/init-extraction/init-extraction.page';
import { ExtractionProgressPage } from './pages/extraction-progress/extraction-progress.page';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'sources', component: SourcesPage },
    { path: 'sources/upload', component: SourcesUploadPage, canDeactivate: [uploadActiveGuard] },
    { path: 'extract-data', component: ExtractDataPage },
    { path: 'extract-data/:id', component: InitExtractionPage },
    { path: 'extraction/:extractionId', component: ExtractionProgressPage }
];
