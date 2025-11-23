import React from 'react'

import { Box, Typography } from '@mui/material'
 
 
function Footer() {
    const styles = {
        footer_box: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 2,
            width: '100%',
        },
    }
  return (
    <Box sx={{height: '5%', backgroundColor: '#020E20', color: '#F7F7F7',  display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontWeight: 'bold',   }}>
<Typography sx={{fontSize: '14px',  }}>@2026 copyright CareBridge</Typography>
    </Box>
  )
}

export default Footer