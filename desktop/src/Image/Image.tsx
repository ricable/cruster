import React, { useState, useEffect } from 'react'
import { v4 } from 'uuid'
import { homedir } from 'os'
import "./Image.css"
import { unzip } from 'zlib'

const statuses = {
  DOWNLOADING: "Downloading...",
  INACTIVE: "",
  UNZIPPING: "Unzipping...",
  ADDING_KEYS: "Adding Keys"
}
let log = ""

const Image = () => {
  const {
    DOWNLOADING,
    INACTIVE,
    ADDING_KEYS,
    UNZIPPING,
  } = statuses
  const addToLog = str => log += "\n" + str
  const [status, setStatus] = useState(INACTIVE)
  const [downloadPercentage, setDownloadPercentage] = useState(0)
  const [unzipPercentage, setUnzipPercentage] = useState(0)

  const [forceRedownload, setForceRedownload] = useState(false)
  const [forceReunzip, setForceReunzip] = useState(false)
  const [crusterDir, setCrusterDir] = useState("")
  useEffect(() => {
    setCrusterDir(ipcRenderer.sendSync("get-cruster-dir"))
  }, [])

  useEffect(() => {
    setCrusterDir(ipcRenderer.sendSync("get-cruster-dir"))
  }, [])

  const changeCrusterDir = () => ipcRenderer.send("change-cruster-dir")
  useEffect(() => {
    ipcRenderer.on("cruster-dir-changed", (event, arg) => {
      setCrusterDir(arg.crusterDir)
    })
  })

  const [ghUsername, setGHUsername] = useState("")
  const [whyGHUsername, setWhyGHUsername] = useState(false)

  const downloadImg = () => {
    if (status !== "") return
    addToLog("Downloading...")
    setStatus(DOWNLOADING)
    const downloadID = v4()
    ipcRenderer.send('download-image', {downloadID, force: forceRedownload})
    const onDownloadProgress = (event, arg) => {
      if (downloadID === arg.downloadID)
        setDownloadPercentage(arg.percentage)
    }
    ipcRenderer.on('download-progress', onDownloadProgress)
    const onCompleted = (event, arg) => {
      if (downloadID === arg.downloadID) {
        ipcRenderer.off('download-complete', onCompleted)
        ipcRenderer.off('download-progress', onDownloadProgress)
        ipcRenderer.off('already-downloaded', onAlreadyDownloaded)
        addToLog("Download complete.")
        setStatus(UNZIPPING)
        unzipImg()
      }
    }
    const onAlreadyDownloaded = (event, arg) => {
      if (downloadID === arg.downloadID) {
        addToLog("Already downloaded.")
        ipcRenderer.off('already-downloaded', onAlreadyDownloaded)
        setStatus(UNZIPPING)
        unzipImg()
      }
    }
    ipcRenderer.on('already-downloaded', onAlreadyDownloaded)
    ipcRenderer.on('download-complete', onCompleted)
  }

  const unzipImg = () => {
    addToLog("Unzipping...")
    const unzipID = v4()
    ipcRenderer.send('unzip-image', {unzipID, force: forceReunzip})

    const onUnzipProgress = (event, arg) => {
      if (unzipID === arg.unzipID)
        setUnzipPercentage(arg.percentage)
    }
    ipcRenderer.on('unzip-progress', onUnzipProgress)

    const onCompleted = (event, arg) => {
      if (unzipID === arg.unzipID) {
        addToLog("Unzipped successfully.")
        setStatus(ADDING_KEYS)
        ipcRenderer.off("unzip-complete", onCompleted)
        ipcRenderer.off("unzip-progress", onUnzipProgress)
        ipcRenderer.off("already-unzipped", onAlreadyUnzipped)
      }
    }
    const onAlreadyUnzipped = (event, arg) => {
      addToLog("Already unzipped.")
      setStatus(ADDING_KEYS)
      ipcRenderer.off("unzip-complete", onCompleted)
      ipcRenderer.off("unzip-progress", onUnzipProgress)
    }
    ipcRenderer.on("unzip-complete", onCompleted)
  }


  return (
    <div>
      <br />
      <div className="dir-container">
        <div>Cruster Directory: &nbsp;{crusterDir}
        </div>
        <button onClick={changeCrusterDir}>Change</button>
      </div>
      <div className="checkbox-options">
        <label className="checkbox-container indent-1">
          <input type="checkbox"
            checked={forceRedownload}
            onChange={() => setForceRedownload(!forceRedownload)}
          />
          <span className="checkmark" />
          Force Re-Download
        </label>
        <label className="checkbox-container indent-1">
          <input type="checkbox"
            checked={forceReunzip}
            onChange={() => setForceReunzip(!forceReunzip)}
          />
          <span className="checkmark" />
          Force Re-Unzip
        </label>
      </div>
      <div className="text-input-container">
        <div className="label">
          Github Username:&nbsp;&nbsp;
          <span className="modal-link" onClick={() => setWhyGHUsername(!whyGHUsername)}>?</span>
        </div>
        <div><input placeholder="Your Github Username" className="text-field" type="text" /></div>
      </div>
      {!whyGHUsername ? "" : (
        <div>
          <p className="note">
            {"We can retrieve the public keys from your github account, so the app you can communicate with your raspberry pi without having to copy your keys manually (from https://github.com/<your username>.keys)"}
          </p>
        </div>
      )}
      <button onClick={downloadImg}>Create Image</button>
      <br />
      {status !== DOWNLOADING ? "" : <ProgressBar percentage={downloadPercentage} title={DOWNLOADING} />}
      {status !== UNZIPPING ? "" : <ProgressBar percentage={unzipPercentage} title={UNZIPPING} />}
      <pre>{log}</pre>
    </div>

  )
}

const ProgressBar = ({percentage, title}) => (
  <>
  {title ? <div className="progress-title">{title}</div> : ""}
  <div className="progress-bar">
    <div className="progress-percentage">{`${percentage.toPrecision(3)}%`}</div>
    <div className="progress-bar-container">
      <div className="progress-bar-bg" />
      <div
        style={{width: `${percentage}%`}}
        className="progress-bar-progress"
      />
    </div>
  </div>
  </>
)

export default Image