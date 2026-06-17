import { Component, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router, RouterOutlet, RouterLink, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { TopNav, NavLink } from './ncss/navs/topnav/topnav.component';
import { Card } from './ncss/cards/card/card.component';
import { Button } from './ncss/buttons/button/button.component';
import { ThemeService } from './ncss/services/theme.service';
import { AuthService } from './services/auth.service';
import { PalleteIcon } from './ncss/icons';
import { SquareButton } from './ncss/buttons/square-button/square-button.component';
import { PageLoaderComponent } from './components/page-loader/page-loader.component';
import { environment } from '../environments/environment';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav, RouterLink, Card, Button, PalleteIcon, SquareButton, PageLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  protected readonly logoUrl = 'logo.png';
  protected readonly navLinks: NavLink[] = [
    { label: 'Sources', link: '/sources' },
    { label: 'Extractions', link: '/extractions' },
    { label: 'Data Prep', link: '/data-prep' },
  ];
  protected currentTheme = toSignal(this.themeService.theme$, { initialValue: this.themeService.getTheme() });
  protected isLoadingPage = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationStart) this.isLoadingPage.set(true);
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.isLoadingPage.set(false);
      }
    });
  }

  protected toggleTheme(): void {
    this.themeService.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  protected async signOut(): Promise<void> {
    const token = await this.authService.getAccessToken();
    this.authService.signOut();
    this.router.navigate(['/login']);
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/signout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({ error: () => {} });
    }
  }
}
