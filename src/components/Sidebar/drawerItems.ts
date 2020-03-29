// very very beta
interface drawerItem {
  title: string;
  content?: (ContentEntity)[] | null;
  contentType?: string | null;
}
export interface ContentEntity {
  title: string;
  content?: null;
  contentType?: null;
  noExpansionPanelPadding?: boolean;
}

export default [
  {
    title: 'Forest',
    content: null,
    contentType: 'forestContent',
    noExpansionPanelPadding: true
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
    content: null,
    contentType: 'biodiversityContent',
    noExpansionPanelPadding: true
  },
  {
    title: 'Wetlands',
    content: null,
    contentType: 'wetlandsContent'
  },
  {
    title: 'Air pollution',
    contentType: 'text',
    content: [
      'Air pollution indicator NO2',
      'Burning fossil fuel creates air pollutants such as NO₂ and small particles.',
      'Air cleanliness',
      'The satellite NO₂ data is based on Sentinel 5P measurements and is updated approximately once per 24 hours for any given location. A healthy threshold of NO₂ is around 50 umol/m2.'
    ]
  },
  {
    title: 'Buildings',
    content: null,
    contentType: 'buildingsContent'
  },
  // {
  //   title: 'Urban green areas',
  //   content: null,
  //   contentType: null
  // },
  {
    title: 'Snow cover',
    contentType: 'snowCoverContent',
    content: null
  },
  // {
  //   title: 'Water emissions',
  //   content: null,
  //   contentType: null
  // },
];
