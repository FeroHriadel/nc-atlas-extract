import { Component } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';



@Component({
    selector: 'app-help',
    imports: [Card, AppContainer],
    templateUrl: './help.page.html',
})
export class HelpPage {}
