import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { TopNav, NavLink } from './ncss/navs/topnav/topnav.component';
import { Card } from './ncss/cards/card/card.component';
import { Button } from './ncss/buttons/button/button.component';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav, RouterLink, Card, Button],
  templateUrl: './app.html',
  styleUrl: './app.css'
})



export class App {
  public logoUrl: string = 'logo.png';
  public navLinks: NavLink[] = [
    { label: 'Sources', link: '/sources' },
  ];

}
