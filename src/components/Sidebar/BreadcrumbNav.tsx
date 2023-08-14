import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Box, Link as MuiLink, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

import { getRoutesForPath } from '#/common/utils/routing'
import { RouteTree } from '#/common/types/routing'

interface Props {
  routeTree: RouteTree
}

const BreadcrumbNav = ({ routeTree }: Props) => {
  const pathname = usePathname()

  const routes = getRoutesForPath(pathname, routeTree)

  const RouteElement = ({ route, name }: { route: string; name: string }) => (
    <MuiLink href={route} sx={{ color: 'inherit' }} component={Link}>
      <Typography
        sx={(theme) => ({
          display: 'inline-block',
          typography: theme.typography.subtitle1,
          '&:hover': { color: theme.palette.primary.main },
        })}
      >
        {name}
      </Typography>
    </MuiLink>
  )

  const RouteElementInert = ({ name }: { name: string }) => (
    <>
      <Typography
        sx={(theme) => ({
          display: 'inline-block',
          typography: theme.typography.subtitle1,
          color: 'neutral.darker',
        })}
      >
        {name}
      </Typography>
    </>
  )

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        minHeight: '60px',
        color: theme.palette.neutral.dark,
      })}
    >
      {routes.length > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <MuiLink href={routes[routes.length - 2].path} component={Link}>
            <ArrowBackIosNewIcon
              sx={(theme) => ({
                float: 'left',
                cursor: 'pointer',
                color: theme.palette.neutral.dark,
                margin: '0 10px 0 0',
                '&:hover': { color: theme.palette.neutral.main },
              })}
            ></ArrowBackIosNewIcon>
          </MuiLink>
          <Box sx={{ display: 'inline-block' }}>
            {routes.map((route) => {
              if (route === routes[routes.length - 1]) {
                return <RouteElementInert key={route.path} name={route.name}></RouteElementInert>
              }
              return (
                <Box
                  sx={(theme) => ({
                    display: 'inline-block',
                  })}
                  key={route.path}
                >
                  <RouteElement route={route.path} name={route.name}></RouteElement>
                  <Typography
                    sx={(theme) => ({
                      display: 'inline-block',
                      margin: '0 5px 0 5px',
                    })}
                  >
                    /
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>

    // <nav aria-label="breadcrumb">
    //   {breadcrumbs.map((breadcrumb, index) => {
    //     const isLast = index === breadcrumbs.length - 1;
    //     const breadcrumbPath = `/${breadcrumbs.slice(0, index + 1).join('/')}`;

    //     return (
    //       <React.Fragment key={breadcrumb}>
    //         {!isLast ? (
    //           <Link href={breadcrumbPath}>
    //             <a>{breadcrumb}</a>
    //           </Link>
    //         ) : (
    //           <span>{breadcrumb}</span>
    //         )}
    //         {!isLast && separator}
    //       </React.Fragment>
    //     );
    //   })}
    // </nav>
  )
}

export default BreadcrumbNav
