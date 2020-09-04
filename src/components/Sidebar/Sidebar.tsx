import React, { useState } from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';

import { ListItem, Button } from '@material-ui/core';
import { useObservable } from 'micro-observables';
import * as SidebarState from './SidebarState'
import { removeLayer, addSource, addLayer } from 'src/map/map';
import { replaceLayer } from 'src/map/utils';

const drawerWidth = 340;

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
    },
    dropdownList: {
      marginTop: 60,
    },
    drawer: {
      width: drawerWidth,
      flexShrink: 0,
    },
    drawerPaper: {
      width: drawerWidth,
    },
    drawerItem: {
      marginBottom: theme.spacing(4),
      height: 47,
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
    },
    toolbar: theme.mixins.toolbar,
  }),
);



const mapKeys = [
  // '20200717_061121_061121',
  '20200808_060150_060150',
  '20200809_060712_060712',
  '20200809_091458_091458',
  '20200810_060914_060914',
  '20200810_091255_091255',
  '20200811_061424_061424',
  '20200811_090527_090600',
  '20200812_061358_061551',
  '20200812_092115_092151',
  '20200812_092115_092230',
  '20200813_061527_061716',
  '20200813_090135_091647',
  '20200814_065018_065018',
  '20200814_091223_091223',
  '20200815_060522_061453',
  '20200815_091045_091045',
  '20200816_060625_060625',
  '20200816_090452_090452',
  '20200817_064053_064053',
  '20200817_090117_091613',
  '20200818_061433_061838',
  '20200818_091422_091422',
  '20200819_061941_061941',
  '20200819_090658_090658',
  '20200820_062027_062027',
  '20200820_090506_090506',
  '20200821_060459_062227',
  '20200821_090320_091726',
  '20200822_060953_060953',
  '20200822_091329_091329',
  '20200823_061058_061058',
  '20200823_091212_091212',
  '20200824_061100_061100',
  '20200824_090624_090624',
  '20200825_064625_064625',
  '20200825_091725_091725',
  '20200826_061951_061951',
  '20200826_090109_091546',
  '20200828_063652_063652',
  '20200829_061013_063847',
  '20200829_090441_090441',
  '20200830_061430_061430',
  '20200830_061430_064043',
  '20200830_085640_085640',
  '20200830_091421_091421',
  '20200831_064125_064125',
  '20200902_090304_090304',
  ]

const clouds = [
  // '20200717_061121_061121',
  '20200808_060150_060150',
  '20200809_060712_060712',
  '20200809_091458_091458',
  '20200810_060914_060914',
  // '20200810_091255_091255', // partially cloudy
  // '20200811_061424_061424',
  // '20200811_090527_090600',
  // '20200812_061358_061551',
  // '20200812_092115_092151',

  // TODO: check the rest
  '20200812_092115_092230',
  '20200813_061527_061716',
  '20200813_090135_091647',
  '20200814_065018_065018',
  '20200814_091223_091223',
  '20200815_060522_061453',
  '20200815_091045_091045',
  '20200816_060625_060625',
  '20200816_090452_090452',
  '20200817_064053_064053',
  '20200817_090117_091613',
  '20200818_061433_061838',
  '20200818_091422_091422',
  '20200819_061941_061941',
  '20200819_090658_090658',
  '20200820_062027_062027',
  '20200820_090506_090506',
  '20200821_060459_062227',
  '20200821_090320_091726',
  '20200822_060953_060953',
  '20200822_091329_091329',
  '20200823_061058_061058',
  '20200823_091212_091212',
  '20200824_061100_061100',
  '20200824_090624_090624',
  '20200825_064625_064625',
  '20200825_091725_091725',
  '20200826_061951_061951',
  '20200826_090109_091546',
  '20200828_063652_063652',
  '20200829_061013_063847',
  '20200829_090441_090441',
  '20200830_061430_061430',
  '20200830_061430_064043',
  '20200830_085640_085640',
  '20200830_091421_091421',
  '20200831_064125_064125',
  '20200902_090304_090304',
  ]


const itemText = x => {
  const date = x.slice(0,4) + '-' + x.slice(4,6) + '-' + x.slice(6,8)
  const d = new Date(date)

  const t = x.slice(9,11) + ':' + x.slice(11,13) + '…' + x.slice(16,18) + ':' + x.slice(18,20)

  const day = d.getDate() < 10 ? '0'+d.getDate() : d.getDate()
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
  const year = d.getFullYear()
  const dateStr = `${day} ${mon} ${year}`

  return dateStr + '  ' + t
}

for (const x of mapKeys) {
  addSource(`mauritius-oil-spill-raster-${x}`, {
    "type": 'raster',
    "tiles": [`https://mauritius.avoinmap.org/${x}/{z}/{x}/{y}.png?v=00debug3`],
    'tileSize': 512,
    "minzoom": 8,
    "maxzoom": 18,
  });
}

let initialized = false
const selectLayer = x => {

  if (initialized) {
  removeLayer('mauritius-oil-spill-raster2')
  } else {
    addLayer({
      id: 'mauritius-oil-spill-raster2',
      'source': 'mauritius-oil-spill-raster2',
      'type': 'raster',
      'minzoom': 8,
      // 'maxzoom': 10,
      // paint: {
      //     'raster-opacity': 0.6,
      // },
      BEFORE: 'FILL',
    })
  }

  replaceLayer({
    id: 'mauritius-oil-spill-raster2',
    'source': `mauritius-oil-spill-raster-${x}`,
    'type': 'raster',
    'minzoom': 8,
    // 'maxzoom': 10,
    // paint: {
    //     'raster-opacity': 0.6,
    // },
    BEFORE: 'FILL',
  })

  initialized=true

  // registerGroup('mauritius-oil-spill', ['mauritius-oil-spill-raster2'])
}

const DEFAULT_KEY = '20200811_061424_061424'
selectLayer(DEFAULT_KEY)

export function MainMenu() {
  const [selectedKey, selectKey] = useState(DEFAULT_KEY)
  const selectKey2 = x => {
    selectKey(x)
    selectLayer(x)
  }
  const classes = useStyles({});
  return <List className={classes.dropdownList}>
  {
    mapKeys.map((item, i) =>
      <ListItem key={i} style={{'padding': 0}}>
        <Button onClick={() => selectKey2(item)} color={selectedKey===item ? 'secondary' : 'default'}>
          {itemText(item)}
          {clouds.includes(item)? ' ☁' : ''}
          </Button>
      </ListItem>
    )
  }
  </List>
}

function Sidebar({ children }) {
  const classes = useStyles({});
  const sidebarOpen = useObservable(SidebarState.isOpenObservable)

  return (
    <div className={"left-drawer"}>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
      >
        {children}
      </Drawer>

    </div>
  );
}

export default Sidebar
