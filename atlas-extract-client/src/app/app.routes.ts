import { Routes } from '@angular/router';
import { uploadActiveGuard } from './guards/upload-active.guard';
import { HomePage } from './pages/home/home.page';



export const routes: Routes = [
    { 
        path: '', 
        component: HomePage 
    },
    { 
        path: 'sources', 
        loadComponent: () => import('./pages/sources/sources.page').then(m => m.SourcesPage) 
    },
    { 
        path: 'sources/upload', 
        loadComponent: () => import('./pages/sources-upload/sources-upload.page').then(m => m.SourcesUploadPage), 
        canDeactivate: [uploadActiveGuard] 
    },
    { 
        path: 'extract-data', 
        loadComponent: () => import('./pages/extract-data/extract-data.page').then(m => m.ExtractDataPage) 
    },
    { 
        path: 'extract-data/:id', 
        loadComponent: () => import('./pages/init-extraction/init-extraction.page').then(m => m.InitExtractionPage) 
    },
    { 
        path: 'extraction/:extractionId', 
        loadComponent: () => import('./pages/extraction-progress/extraction-progress.page').then(m => m.ExtractionProgressPage) 
    },
    {
        path: 'extractions',
        loadComponent: () => import('./pages/extractions/extractions.page').then(m => m.ExtractionsPage)
    },
    {
        path: 'extraction-details/:extractionId',
        loadComponent: () => import('./pages/extraction-details/extraction-details.page').then(m => m.ExtractionDetailsPage)
    },
    { path: '**', redirectTo: '' }
];
