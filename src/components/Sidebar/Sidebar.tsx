import React from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import TextField from '@material-ui/core/TextField';

import Dropdown from '../Dropdown'
import CollapseDrawerButton from './CollapseDrawerButton'
import Logo from './logo.svg'

import { layerComponentList, toggleGroup } from '../../map/layer_groups'

interface SearchInputProps {
  onChange?: any;
}

export function SearchInput(props: SearchInputProps) {
  const { onChange } = props;

  const classes = makeStyles((theme: Theme) =>
    createStyles({
      search: {
      }
    }),
  )({})

  return (
    <TextField
      size="small"
      className={classes.search}
      onChange={(e) => onChange(e.target.value)}
      id="outlined-search"
      label="Search..."
      type="search"
      variant="outlined" />
  )
}

const drawerWidth = 240;

const drawerItems = [
  { title: 'Forest' },
  { title: 'Fields' },
  { title: 'Biodiversity' },
  { title: 'Air quality' },
  { title: 'Buildings' },
  { title: 'Snow cover' },
];

const filteredItems = (arr: { title: string }[], query: string) => {
  if (!query) {
    return arr
  }

  return arr.filter(
    (x) => x.title.toLowerCase().includes(query.toLowerCase())
  );

}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      paddingLeft: 16
    },
    menuButton: {
      position: 'absolute',
      marginRight: theme.spacing(2),
    },
    hide: {
      display: 'none',
    },
    drawer: {
      width: drawerWidth,
      flexShrink: 0,
    },
    drawerPaper: {
      width: drawerWidth,
    },
    navlink: {
      color: 'black',
      textDecoration: 'none',
    },
    logo: {
      maxWidth: 200,
      float: 'left',
      marginLeft: -12,
      marginBottom: -24
    },
    search: {
      padding: 0
    }

  }),
);

function Sidebar() {
  const classes = useStyles({});
  const [open, setOpen] = React.useState(true);
  const [query, setQuery] = React.useState('')

  const handleDrawerToggle = () => {
    setOpen(!open);
  }

  const toggleLayerGroup = () => {
    toggleGroup(layerComponentList[0]['id'])
    console.log(layerComponentList[0]['id'])
  }
  

  return (
    <>
      {/* <CollapseDrawerButton open={open} onClick={handleDrawerToggle} /> */}
      <CollapseDrawerButton open={open} onClick={toggleLayerGroup} />

      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <img className={classes.logo} src={Logo} alt="Logo" />
        <h4 className={classes.title}>Sustainability map</h4>
        <List>
          <ListItem><SearchInput onChange={setQuery} /></ListItem>
          {
            filteredItems(drawerItems, query).map((v, i) => <ListItem
              key={i}
            >
              <Dropdown
                title={v.title} /></ListItem>
            )
          }
        </List>
        <Divider />
        <List>
          <Link className={classes.navlink} to={'/info'}>
            <ListItem button>Info</ListItem>
          </Link>
        </List>
      </Drawer>

    </>
  );
}

// Later maybe react-router
const Link = (props: any) => <a
  className={props.className}
  {...props}
  href={props.to}>{props.children}
</a>


export default Sidebar

