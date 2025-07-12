import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('projectsComponent', () => {
  let component: any;
  let fixture: ComponentFixture<any>;

  beforeEach(async () => {
    // Import the component dynamically to avoid import issues
    const componentModule = await import('./projects.component');
    const ComponentClass = Object.values(componentModule)[0] as any;

    await TestBed.configureTestingModule({
      imports: [
        ComponentClass,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render without errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});
