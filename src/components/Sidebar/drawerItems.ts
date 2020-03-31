import BiodiversityContent from "../Accordion/BiodiversityContent";
import WetlandsContent from "../Accordion/WetlandsContent";
import BuildingsContent from "../Accordion/BuildingsContent";
import SnowCoverContent from "../Accordion/SnowCoverLossContent";
import ForestContent from "../Accordion/ForestContent";

export interface ContentEntity {
  title: string;
  content?: null;
  contentType?: null;
  noExpansionPanelPadding?: boolean;
}

export default [
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
  // {
  //   title: 'Urban green areas',
  //   content: null,
  //   contentType: null
  // },
  {
    title: 'Snow cover loss',
    content: SnowCoverContent,
  },
  // {
  //   title: 'Water emissions',
  //   content: null,
  //   contentType: null
  // },
];
