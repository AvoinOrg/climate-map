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
}

export default [
  {
    title: 'Forest',
    content: null,
    contentType: null
  },
  {
    title: 'Field',
    content: [
      {
        link: {
          textBefore: ` Farm field data is private. Farmer, please  `,
          to: '#', text: 'register' ,
          textAfter: ` for early access.`
        }
      }
    ],
    contentType: 'textWithLink'
  },
  {
    title: 'Biodiversity',
    content: null,
    contentType: null
  },
  {
    title: 'Wetlands',
    content: null,
    contentType: null
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
    contentType: null
  },
  {
    title: 'Urban green areas',
    content: null,
    contentType: null
  },
  {
    title: 'Snow cover',
    content: [
      `This layer shows the global decrease in 
      the amount of snow over time. Each area 
      shown corresponds to an area that 
      between 1980 and 1990 had at least 10 
      days of snow on average. This average is 
      contrasted with the average snowfall 
      between 1996 and 2016.`,

      {
        link: {
          textBefore: `The data comes from FT-ESDR or `,
          to: '#', text: 'Freeze/Thaw Earth System Data Record.' }
      }
    ],
    contentType: 'textWithLink'
  },
  {
    title: 'Water emissions',
    content: null,
    contentType: null
  },
];