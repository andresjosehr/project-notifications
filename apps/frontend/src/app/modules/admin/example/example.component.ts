import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { DynamicNavigationService } from 'app/core/navigation/dynamic-navigation.service';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { Observable } from 'rxjs';

@Component({
    selector     : 'example',
    standalone   : true,
    templateUrl  : './example.component.html',
    encapsulation: ViewEncapsulation.None,
})
export class ExampleComponent implements OnInit
{
    navigation$: Observable<FuseNavigationItem[]>;

    /**
     * Constructor
     */
    constructor(private _dynamicNavigationService: DynamicNavigationService)
    {
        this.navigation$ = this._dynamicNavigationService.navigation$;
    }

    /**
     * On init
     */
    ngOnInit(): void {
        // Actualizar la navegación dinámica
        this._dynamicNavigationService.updateNavigation();
    }
}
