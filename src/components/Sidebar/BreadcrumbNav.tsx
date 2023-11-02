import React from 'react'
import { usePathname } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

import Link from '#/components/common/Link'
import { getRoutesForPath } from '#/common/utils/routing'
import { RouteTree } from '#/common/types/routing'

interface Props {
  routeTree: RouteTree
}

const BreadcrumbNav = ({ routeTree }: Props) => {
  const pathname = usePathname()

  const routes = getRoutesForPath(pathname, routeTree)

  const RouteElement = ({ route, name }: { route: string; name: string }) => (
    <Link href={route} sx={{ color: 'inherit' }}>
      <Typography
        sx={(theme) => ({
          display: 'inline-block',
          typography: theme.typography.subtitle2,
          '&:hover': { color: theme.palette.primary.main },
          textTransform: 'uppercase',
        })}
      >
        {name}
      </Typography>
    </Link>
  )

  const RouteElementInert = ({ name }: { name: string }) => (
    <>
      <Typography
        sx={(theme) => ({
          display: 'inline-block',
          typography: theme.typography.subtitle2,
          color: 'neutral.darker',
          textTransform: 'uppercase',
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
        color: theme.palette.neutral.dark,
      })}
    >
      {routes.length > 1 && (
        <Box
          sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        >
          <Link href={routes[routes.length - 2].path}>
            <ArrowBackIosNewIcon
              sx={(theme) => ({
                float: 'left',
                cursor: 'pointer',
                color: theme.palette.neutral.dark,
                margin: '0 10px 0 -5px',
                '&:hover': { color: theme.palette.neutral.main },
              })}
            ></ArrowBackIosNewIcon>
          </Link>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {routes.map((route) => {
              if (route === routes[routes.length - 1]) {
                return (
                  <RouteElementInert
                    key={route.path}
                    name={route.name}
                  ></RouteElementInert>
                )
              }
              return (
                <Box
                  sx={(theme) => ({
                    display: 'inline-block',
                    lineHeight: '0',
                    height: '18px',
                  })}
                  key={route.path}
                >
                  <RouteElement
                    route={route.path}
                    name={route.name}
                  ></RouteElement>
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
