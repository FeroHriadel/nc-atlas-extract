import { Component } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon } from '../../ncss/icons';



@Component ({
  selector: 'app-home',
  imports: [Card, AppContainer, UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  protected readonly logoUrl = 'logo.png';
}
