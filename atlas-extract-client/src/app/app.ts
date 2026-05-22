import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink } from '@angular/router';
import { TopNav, NavLink } from './ncss/navs/topnav/topnav.component';
import { Card } from './ncss/cards/card/card.component';
import { Button } from './ncss/buttons/button/button.component';
import { ThemeService } from './ncss/services/theme.service';
import { PalleteIcon } from './ncss/icons';
import { SquareButton } from './ncss/buttons/square-button/square-button.component';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav, RouterLink, Card, Button, PalleteIcon, SquareButton],
  templateUrl: './app.html',
  styleUrl: './app.css'
})



export class App {
  private themeService = inject(ThemeService);
  public currentTheme = toSignal(this.themeService.theme$, { initialValue: this.themeService.getTheme() });
  public logoUrl: string = 'logo.png';
  public navLinks: NavLink[] = [
    { label: 'Sources', link: '/sources' },
  ];

  toggleTheme(): void {
    this.themeService.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

}
