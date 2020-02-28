import React from 'react'
import { List, ListItem, Switch, Container, createStyles, makeStyles, Theme } from '@material-ui/core';

interface BuildingsContentProps {
  item: any;
  items: any;
  checked: string;
  onChange: Function;
}

const BuildingsContent = (props: BuildingsContentProps) => {
  const { item, items, checked, onChange } = props
  return <>
          <Switch
            checked={checked == item}
            onChange={() => onChange(item)} /> {items[item]}
        </>
}

export default BuildingsContent
