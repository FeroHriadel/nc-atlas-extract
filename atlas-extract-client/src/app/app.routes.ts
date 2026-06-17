import { Routes } from '@angular/router';
import { uploadActiveGuard } from './guards/upload-active.guard';
import { authGuard } from './guards/auth.guard';
import { HomePage } from './pages/home/home.page';



export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
    },
    {
        path: 'help',
        loadComponent: () => import('./pages/help/help.page').then(m => m.HelpPage)
    },
    {
        path: '',
        component: HomePage,
        canActivate: [authGuard]
    },
    {
        path: 'sources',
        loadComponent: () => import('./pages/sources/sources.page').then(m => m.SourcesPage),
        canActivate: [authGuard]
    },
    {
        path: 'sources/upload',
        loadComponent: () => import('./pages/sources-upload/sources-upload.page').then(m => m.SourcesUploadPage),
        canActivate: [authGuard],
        canDeactivate: [uploadActiveGuard]
    },
    {
        path: 'extract-data',
        loadComponent: () => import('./pages/extract-data/extract-data.page').then(m => m.ExtractDataPage),
        canActivate: [authGuard]
    },
    {
        path: 'extract-data/:id',
        loadComponent: () => import('./pages/init-extraction/init-extraction.page').then(m => m.InitExtractionPage),
        canActivate: [authGuard]
    },
    {
        path: 'extraction/:extractionId',
        loadComponent: () => import('./pages/extraction-progress/extraction-progress.page').then(m => m.ExtractionProgressPage),
        canActivate: [authGuard]
    },
    {
        path: 'extractions',
        loadComponent: () => import('./pages/extractions/extractions.page').then(m => m.ExtractionsPage),
        canActivate: [authGuard]
    },
    {
        path: 'extraction-details/:extractionId',
        loadComponent: () => import('./pages/extraction-details/extraction-details.page').then(m => m.ExtractionDetailsPage),
        canActivate: [authGuard]
    },
    {
        path: 'data-prep',
        loadComponent: () => import('./pages/data-prep/data-prep.page').then(m => m.DataPrepPage),
        canActivate: [authGuard]
    },
    {
        path: 'data-prep/:extractionId',
        loadComponent: () => import('./pages/data-prep-details/data-prep-details.page').then(m => m.DataPrepDetailsPage),
        canActivate: [authGuard]
    },
    { path: '**', redirectTo: '' }
];
