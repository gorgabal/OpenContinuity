import { useState, useEffect } from 'react'
import { getScenes, getShootingDays, addScene } from '../services/database'

export function useScenes() {
  const [scenes, setScenes] = useState([])
  const [shootingDays, setShootingDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [scenesData, shootingDaysData] = await Promise.all([
          getScenes(),
          getShootingDays()
        ])
        setScenes(scenesData)
        setShootingDays(shootingDaysData)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const createScene = async (sceneData) => {
    try {
      await addScene(sceneData)
      // Refresh the data
      const newScenesData = await getScenes()
      setScenes(newScenesData)
    } catch (err) {
      console.error('Error creating scene:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    scenes,
    shootingDays,
    loading,
    error,
    createScene
  }
}