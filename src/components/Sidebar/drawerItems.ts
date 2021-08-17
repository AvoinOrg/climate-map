import BiodiversityContent from "../Accordion/BiodiversityContent";
import WetlandsContent from "../Accordion/WetlandsContent";
import BuildingsContent from "../Accordion/BuildingsContent";
import SnowCoverLossContent from "../Accordion/SnowCoverLossContent";
import ForestContent from "../Accordion/ForestContent";
import AirQualityContent from "../Accordion/AirQualityContent";
import UserContent from "../Accordion/UserContent";
import PrivateContent from "../Accordion/PrivateContent";

export interface ContentEntity {
  title: string;
  content?: null;
  contentType?: null;
  noExpansionPanelPadding?: boolean;
}

const drawerItems = [
  {
    title: "Your data",
    content: UserContent,
  },
  {
    title: "Forest",
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
    title: "Biodiversity",
    content: BiodiversityContent,
  },
  {
    title: "Wetlands",
    content: WetlandsContent,
  },
  {
    title: "Buildings",
    content: BuildingsContent,
  },
  {
    title: "Air quality",
    content: AirQualityContent,
  },
  // {
  //   title: 'Urban green areas',
  //   content: null,
  //   contentType: null
  // },
  {
    title: "Snow cover loss",
    content: SnowCoverLossContent,
  },
  // {
  //   title: 'Water emissions',
  //   content: null,
  //   contentType: null
  // },
];

export default drawerItems;

export const privateDrawerItems = [
  {
    title: "Private data",
    content: PrivateContent,
  },
];
