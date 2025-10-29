import { useState, useEffect } from 'react'
import { getShootingDays, addShootingDay } from '../services/database'

export function useShootingDays() {
  const [shootingDays, setShootingDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const shootingDaysData = await getShootingDays()
        setShootingDays(shootingDaysData)
      } catch (err) {
        console.error('Error loading shooting days:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const createShootingDay = async (shootingDayData) => {
    try {
      await addShootingDay(shootingDayData)
      // Refresh the data
      const newShootingDaysData = await getShootingDays()
      setShootingDays(newShootingDaysData)
    } catch (err) {
      console.error('Error creating shooting day:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    shootingDays,
    loading,
    error,
    createShootingDay
  }
}