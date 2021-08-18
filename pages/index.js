import Head from 'next/head'
import DefaultPage from '../components/defaultPage/defaultPage';
import Header from '../components/header/header';
import SideBar from '../components/sideBar/sideBar';
import styles from '../styles/Home.module.css'
import { ChakraProvider } from "@chakra-ui/react"

export default function Home() {
  return (
    <ChakraProvider>
    <div className={styles.container}>
      <SideBar />
    </div>
    </ChakraProvider>
  )
}
