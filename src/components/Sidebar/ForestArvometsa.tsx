import React, { useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';

import { SimpleTable, HeaderTable } from './ForestArvometsaTable'
import { Container, FormControlLabel, Checkbox, InputLabel, Select, FormControl } from '@material-ui/core';

import { ArvometsaChart } from './ArvometsaChart'


const onChangeCheckbox = (callback: React.Dispatch<React.SetStateAction<boolean>>) => {
  return (event: any) => { callback((event.target as HTMLInputElement).checked) }
}
const onChangeValue = (callback: React.Dispatch<React.SetStateAction<any>>) => {
  return (event: any) => { callback((event.target as HTMLInputElement).value) }
}

function ResponsiveDrawer2() {
  const [scenario, setScenario] = useState('arvometsa_eihakata')
  const [perHectareFlag, setPerHectareFlag] = useState(false)
  const [cumulativeFlag, setCumulativeFlag] = useState(false)
  const [carbonBalanceDifferenceFlag, setCarbonBalanceDifferenceFlag] = useState(false)

  return <div className="grid-parent">

    <Paper className="grid-col1" elevation={5}>
      <Container>
        <HeaderTable /> {/* area size */}
        <br />
        <Paper>
          <FormControlLabel
            style={{ padding: '4px 10px' }}
            control={<Checkbox />}
            label="Show values per hectare"
            value={perHectareFlag}
            onChange={onChangeCheckbox(setPerHectareFlag)}
          />
        </Paper>
        <br />
        <SimpleTable /> {/* area stats */}
        <p>* Assuming even-age forestry</p>
        <p>*
        Carbon balance means changes in soil, trees, and wood products.
        When the carbon balance is positive, more carbon is being stored than released.
        </p>

        <h1>Forestry projections</h1>
        <Divider />

        <FormControl style={{ width: '100%' }}>
          <InputLabel htmlFor="age-native-simple">Forestry method</InputLabel>
          <Select
            native
            inputProps={{
              name: 'age',
              id: 'age-native-simple',
            }}
            value={scenario}
            onChange={onChangeValue(setScenario)}
          >
            <option value="arvometsa_eihakata"> No cuttings </option>
            <option value="arvometsa_jatkuva"> Continuous cover forestry </option>
            <option value="arvometsa_alaharvennus"> Thin from below – clearfell </option>
            <option value="arvometsa_ylaharvennus"> Thin from above – extended rotation </option>
            <option value="arvometsa_maxhakkuu"> Removal of tree cover </option>
          </Select>
        </FormControl>


      </Container>
    </Paper>

    <Paper className="grid-col2" elevation={2}>
      <Container>
        <Paper>
          <FormControlLabel
            style={{ padding: '4px 10px' }}
            control={<Checkbox />}
            label="Show cumulative carbon balance"
            value={cumulativeFlag}
            onChange={onChangeCheckbox(setCumulativeFlag)}
          />
        </Paper>

        <br />
        <Paper>
          <FormControlLabel
            style={{ padding: '4px 10px' }}
            control={<Checkbox />}
            label="Show carbon balance improvement potential compared to the prevalent forestry practice"
            value={carbonBalanceDifferenceFlag}
            onChange={onChangeCheckbox(setCarbonBalanceDifferenceFlag)}
          />
        </Paper>

        <br />
          CO2 Balance

          <br />
          Forest carbon stock
          <ArvometsaChart
          scenarioName={scenario}
          cumulativeFlag={cumulativeFlag}
          perHectareFlag={perHectareFlag}
          carbonBalanceDifferenceFlag={carbonBalanceDifferenceFlag}
        />

        <br />
          Harvested wood


          <br />
        <Button>Read about the methodology</Button>

        <br />
        <Button>Close this panel</Button>

      </Container>
    </Paper>
  </div>
}

export default ResponsiveDrawer2;
