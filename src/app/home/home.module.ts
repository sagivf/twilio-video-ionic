import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {HttpClientModule} from '@angular/common/http';
// import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Diagnostic} from '@ionic-native/diagnostic/ngx';

import { HomePage } from './home.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ])
  ],
  // providers: [AndroidPermissions],
  providers: [Diagnostic],
  declarations: [HomePage]
})
export class HomePageModule {}
