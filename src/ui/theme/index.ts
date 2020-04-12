import { createMuiTheme } from '@material-ui/core/styles';

declare module '@material-ui/core/styles/createMuiTheme' {
    interface ThemeOptions {    
        themeName?: string  // optional
    }
}

const palette = {
  primary: { main: '#fbfbfb', contrastText: '#282c34' },
  secondary: { main: '#88c0f5', contrastText: '#0a0e11' }
};
const themeName = 'Porcelain Malibu Guinea';

export default createMuiTheme({ palette, themeName });
