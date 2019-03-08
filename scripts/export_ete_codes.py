import json
import sys
import lxml.etree as etree
from itertools import chain

# NB: git clone https://github.com/eliask/fi-forest-data-schema
root = etree.XML(open('fi-forest-data-schema/schema/ForestFeatureEnumeratives.xsd').read())

def get_code_for_type(name):
    e = [x for x in root if x.attrib.get('name','').lower() == f'{name.lower()}type'][0]
    title = [x for x in e[0] if x.attrib.values() == ['en']][0].text or [x for x in e[0] if x.attrib.values() == ['fi']][0].text
    codes = [x.attrib['value'] for x in e[1]]
    names = [
        [z.text for z in x[0] if z.attrib.values()==['en']][0] or \
        [z.text for z in x[0] if z.attrib.values()==['fi']][0]
        for x in e[1]
    ]
    return title, dict(zip(codes, names))

OriginalFeatureCode=get_code_for_type('OriginalFeatureCode')
FeatureType=get_code_for_type('FeatureType')
FeatureCodeExtensions=get_code_for_type('FeatureCodeExtensions')
FeatureAdditionalCode=get_code_for_type('FeatureAdditionalCode')

# Override labels.
OriginalFeatureCode[1]['95'] = 'Potential METSO Habitat'
OriginalFeatureCode[1]['98'] = 'METSO Habitat'

all_feature_codes = list(chain(
    chain(*((int(k),v) for k,v in OriginalFeatureCode[1].items())),
    chain(*((int(k),v) for k,v in FeatureCodeExtensions[1].items())),
))
json.dump(all_feature_codes, sys.stdout, indent=2, ensure_ascii=False)
print()
