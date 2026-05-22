import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { SourcesPage } from './pages/sources/sources.page';
import { SourcesUploadPage } from './pages/sources-upload/sources-upload.page';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'sources', component: SourcesPage },
    { path: 'sources/upload', component: SourcesUploadPage }
];
