import React from 'react'
import { Modal, Box, IconButton, SxProps, Theme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

type Props = {
  children: React.ReactNode
  modalBody: React.ReactNode
  sx?: SxProps<Theme>
}

const ClickableModal = ({ modalBody, children, sx }: Props) => {
  const [open, setOpen] = React.useState(false)

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Box
        sx={[
          { '&:hover': { cursor: 'pointer' } },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        onClick={() => setOpen(true)}
      >
        {children}
      </Box>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '100vw',
            overflow: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ mt: 2 }}>{modalBody}</Box>
        </Box>
      </Modal>
    </>
  )
}

export default ClickableModal
