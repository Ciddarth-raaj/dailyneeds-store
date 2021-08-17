import Head from 'next/head'
import DefaultPage from '../components/defaultPage/defaultPage';
import Header from '../components/header/header';
import SideBar from '../components/sideBar/sideBar';
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <SideBar />
    </div>
  )
}
