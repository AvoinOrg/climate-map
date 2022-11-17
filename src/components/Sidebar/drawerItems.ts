import {
  ForestContent,
  BiodiversityContent,
  WetlandsContent,
  BuildingsContent,
  SnowCoverLossContent,
  AirQualityContent,
  // PrivateContent,
} from './Accordion'

export interface ContentEntity {
  title: string
  content?: null
  contentType?: null
  noAccordionPadding?: boolean
}

const drawerItems = [
  // {
  //   title: "Your data",
  //   content: UserContent,
  // },
  {
    title: 'Forest',
    content: ForestContent,
  },
  // {
  //   title: 'Field',
  //   content: [
  //     {
  //       link: {
  //         textBefore: ` Farm field data is private. Farmer, please  `,
  //         to: '#', text: 'register' ,
  //         textAfter: ` for early access.`
  //       }
  //     }
  //   ],
  //   contentType: 'textWithLink'
  // },
  {
    title: 'Biodiversity',
    content: BiodiversityContent,
  },
  {
    title: 'Wetlands',
    content: WetlandsContent,
  },
  {
    title: 'Buildings',
    content: BuildingsContent,
  },
  {
    title: 'Air quality',
    content: AirQualityContent,
  },
  // {
  //   title: 'Urban green areas',
  //   content: null,
  //   contentType: null
  // },
  {
    title: 'Snow cover loss',
    content: SnowCoverLossContent,
  },
  // {
  //   title: 'Water emissions',
  //   content: null,
  //   contentType: null
  // },
]

export default drawerItems

// export const privateDrawerItems = [
//   {
//     title: 'Private data',
//     content: PrivateContent,
//   },
// ]
