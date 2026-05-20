import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon } from '../../ncss/icons';
import { Button } from '../../ncss/buttons/button/button.component';



@Component ({
  selector: 'app-home',
  imports: [RouterOutlet, RouterLink, Card, AppContainer, UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon, Button],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})



export class HomePage {
  public logoUrl: string = 'logo.png';
}