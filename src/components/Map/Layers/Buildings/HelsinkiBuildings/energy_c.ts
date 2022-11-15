// function

function Consuption_E(tecdate, docctilav, hmode) {  
    if (tecdate <= 1975) {
      tecons = docctilav * convert_to_float(eobj.consuption[0].hmode)
    } else if (tecdate <= 1977 || tecdate >= 1976) {
      tecons = docctilav * convert_to_float(eobj.consuption[1].hmode)
    } else if (tecdate <= 1984 || tecdate >= 1978) {
      tecons = docctilav * convert_to_float(eobj.consuption[2].hmode)
    } else if (tecdate <= 2002 || tecdate >= 1985) {
      tecons = docctilav * convert_to_float(eobj.consuption[3].hmode)
    } else if (tecdate <= 2007 || tecdate >= 2003) {
      tecons = docctilav * convert_to_float(eobj.consuption[4].hmode)
    } else if (tecdate <= 2009 || tecdate >= 2008) {
      tecons = docctilav * convert_to_float(eobj.consuption[5].hmode)
    } else if (tecdate <= 2011 || tecdate >= 2010) {
      tecons = docctilav * convert_to_float(eobj.consuption[6].hmode)
    } else if (tecdate <= 2017 || tecdate >= 2012) {
      tecons = docctilav * convert_to_float(eobj.consuption[7].hmode)
    } else if (tecdate >= 2018) {
      tecons = docctilav * convert_to_float(eobj.consuption[8].hmode)
    } else {
      tecons = 0;
    } 
    return tecons.toFixed(2)
  }
  
  // console.log(energyData[0][2])

// Helsinki-Testbed Data

var consuptiontext = '{ "consuption" : [' +
'{"year":"1975", "Oil":"70.917", "dis_heating":"66.272", "direct_heating":"62.625", "awhpump":"45.955", "ghpump":"35.928"},' +  
'{"year":"1976", "Oil":"64.053", "dis_heating": "59.901", "direct_heating":"56.309", "awhpump":"41.838", "ghpump":"32.857"},' +   
'{"year":"1978", "Oil":"55.573", "dis_heating":"52.022", "direct_heating":"48.554", "awhpump":"36.507", "ghpump":"28.958"},' +
'{"year":"1985", "Oil":"53.097", "dis_heating":"49.738", "direct_heating":"46.352", "awhpump":"35.047", "ghpump":"27.861"},' +  
'{"year":"2003", "Oil":"48.289", "dis_heating":"45.339", "direct_heating":"43.156", "awhpump":"32.839", "ghpump":"26.574"},' +  
'{"year":"2008", "Oil":"47.917", "dis_heating":"44.999", "direct_heating":"42.832", "awhpump":"32.612", "ghpump":"26.411"},' +  
'{"year":"2010", "Oil":"40.39", "dis_heating":"38.03", "direct_heating":"36.216", "awhpump":"28.204", "ghpump":"23.408"},' +  
'{"year":"2012", "Oil":"37.074", "dis_heating":"34.92", "direct_heating":"33.122", "awhpump":"26.018", "ghpump":"21.708"},' +  
'{"year":"2018", "Oil":"34.911", "dis_heating":"32.903", "direct_heating":"31.101", "awhpump":"24.632", "ghpump":"20.722"} ]}'
;

var consuptionLtext = '{ "consuptionL" : [' +
'{"year":"1975", "Oil":"64.477", "dis_heating":"59.863" , "direct_heating":"0" , "awhpump":"39.505" , "ghpump":"29.632"},' +
'{"year":"1976", "Oil":"57.639", "dis_heating":"53.518" , "direct_heating":"0" , "awhpump":"35.423" , "ghpump":"26.566"},' +     
'{"year":"1978", "Oil":"49.188", "dis_heating":"45.668" , "direct_heating":"0" , "awhpump":"30.103" , "ghpump":"22.673"},' +  
'{"year":"1985", "Oil":"46.72", "dis_heating":"43.391" , "direct_heating":"0" , "awhpump":"28.657" , "ghpump":"21.578"},' +    
'{"year":"2003", "Oil":"40.638", "dis_heating":"37.719" , "direct_heating":"0" , "awhpump":"25.158" , "ghpump":"19.004"},' +    
'{"year":"2008", "Oil":"40.269", "dis_heating":"37.38" , "direct_heating":"0" , "awhpump":"24.933" , "ghpump":"18.841"},' +    
'{"year":"2010", "Oil":"32.764", "dis_heating":"30.435" , "direct_heating":"0" , "awhpump":"20.554" , "ghpump":"15.848"},' +    
'{"year":"2012", "Oil":"29.844", "dis_heating":"27.72" , "direct_heating":"0" , "awhpump":"18.776" , "ghpump":"14.539"},' +    
'{"year":"2018", "Oil":"27.843", "dis_heating":"25.865" , "direct_heating":"0" , "awhpump":"17.558" , "ghpump":"13.713"} ]}'
;

var consuptionStext = '{ "consuptionS" : [' +
'{"year":"1975", "Oil":"6.44", "dis_heating":"6.409" , "direct_heating":"62.625" , "awhpump":"6.45" , "ghpump":"6.295"},' +  
'{"year":"1976", "Oil":"6.414", "dis_heating":"6.383" , "direct_heating":"56.309" , "awhpump":"6.416" , "ghpump":"6.29"},' +   
'{"year":"1978", "Oil":"6.385", "dis_heating":"6.354" , "direct_heating":"48.554" , "awhpump":"6.404" , "ghpump":"6.285"},' +
'{"year":"1985", "Oil":"6.377", "dis_heating":"6.347" , "direct_heating":"46.352" , "awhpump":"6.391" , "ghpump":"6.283"},' +  
'{"year":"2003", "Oil":"7.651", "dis_heating":"7.62" , "direct_heating":"43.156" , "awhpump":"7.68" , "ghpump":"7.57"},' +  
'{"year":"2008", "Oil":"7.65", "dis_heating":"7.619" , "direct_heating":"42.832" , "awhpump":"7.679" , "ghpump":"7.57"},' +  
'{"year":"2010", "Oil":"7.626", "dis_heating":"7.595" , "direct_heating":"36.216" , "awhpump":"7.65" , "ghpump":"7.56"},' +  
'{"year":"2012", "Oil":"7.23", "dis_heating":"7.2" , "direct_heating":"33.122" , "awhpump":"7.243" , "ghpump":"7.168"},' +  
'{"year":"2018", "Oil":"7.068", "dis_heating":"7.038" , "direct_heating":"31.101" , "awhpump":"7.074" , "ghpump":"7.009"} ]}'
;

export default {consuptiontext, consuptionLtext, consuptionStext};



