import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { SourcesPage } from './pages/sources/sources.page';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'sources', component: SourcesPage }
];
