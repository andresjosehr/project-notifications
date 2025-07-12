import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

describe('AppComponent', () => {
  let component: any;
  let fixture: ComponentFixture<any>;

  beforeEach(async () => {
    const componentModule = await import('./app.component');
    const ComponentClass = Object.values(componentModule)[0] as any;

    await TestBed.configureTestingModule({
      imports: [
        ComponentClass,
        NoopAnimationsModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render without errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
