import Vue from 'vue'
import Router from 'vue-router'
import Setup from '@/views/Setup'
import Home from '@/views/Home'
import Search from '@/views/Search'
import Document from '@/views/Document'
import Indices from '@/views/Indices'
import Snapshots from '@/views/Snapshots'
import Repositories from '@/views/Repositories'
import Utilities from '@/views/Utilities'
import QueryRest from '@/views/QueryRest'
import Nodes from '@/views/Nodes'
import Settings from '@/views/Settings'
import Shards from '@/views/Shards'
import NestedView from '@/views/NestedView'
import store from '@/store'
import ElasticsearchAdapter from '@/services/ElasticsearchAdapter'
import { DefaultClient } from '@/models/clients/DefaultClient'
import {ref} from "@vue/composition-api/dist/vue-composition-api";
import {DEFAULT_ELASTICSEARCH_HOST} from "@/consts";

Vue.use(Router)

const base = process.env.VUE_APP_PUBLIC_PATH || '/'

const router = new Router({
  mode: process.env.VUE_APP_ROUTER_MODE || 'history',
  base,
  routes: [
    {
      path: '/setup',
      name: 'Setup',
      component: Setup,
      beforeEnter: (to, from, next) => {
        if (store.state.connection.instances.length > 0) {
          next('/')
        } else {
          next()
        }
      }
    },
    {
      path: '/cluster/:instanceId',
      component: NestedView,
      props: (route) => ({ id: route.params.instanceId || store.state.connection.activeInstanceIdx }),
      children: [
        { path: '/', name: 'Home', component: Home },
        { path: 'nodes', name: 'Nodes', component: Nodes },
        { path: 'indices', name: 'Indices', component: Indices },
        { path: 'shards', name: 'Shards', component: Shards },
        { path: 'search', name: 'Search', component: Search, props: true },
        { path: 'search/:index/:type?/:id', name: 'Document', component: Document },
        { path: 'utilities', name: 'Utilities', component: Utilities },
        { path: 'settings', name: 'Settings', component: Settings },
        { path: 'snapshots', name: 'Snapshots', component: Snapshots },
        { path: 'snapshot_repositories', name: 'Repositories', component: Repositories },
        { path: 'rest', name: 'Rest', component: QueryRest }
      ]
    },
    {
      path: '*',
      beforeEnter: (to, from, next) => {
        next('/cluster/0/nodes')
      }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  if (to.name === 'Setup') return next()

  const numInstances = store.state.connection.instances.length
  if (numInstances === 0) {
    const elasticsearchHost = ref(Object.assign({}, DEFAULT_ELASTICSEARCH_HOST))

    if (elasticsearchHost.value.uri.trim() && elasticsearchHost.value.name.trim() !== 'default cluster') {
      try {
        await store.commit('connection/addElasticsearchInstance', {
          name: elasticsearchHost.value.name.trim(),
          username: elasticsearchHost.value.username.trim(),
          password: elasticsearchHost.value.password.trim(),
          uri: elasticsearchHost.value.uri.trim(),
          status: elasticsearchHost.value.status
        });
      } catch (error) {
        console.warn(error);
        return next('setup');
      }

      return next({
        name: 'Home',
        params: {
          instanceId: 0,
        },
      });
    }

    return next('setup')
  }

  let instanceId = to.params.instanceId
  try {
    instanceId = parseInt(instanceId);
  } catch (e) {
  }

  if (isNaN(instanceId) || (instanceId + 1) > numInstances || instanceId < 0) {
    return next({
      name: 'Home',
      params: { instanceId: 0 }
    })
  }

  store.commit('connection/setActiveInstanceIdx', instanceId)
  const adapter = new ElasticsearchAdapter(new DefaultClient(store.getters['connection/activeInstance']))
  store.commit('connection/setElasticsearchAdapter', adapter)

  next()
})

router.afterEach((to, _from) => {
  Vue.nextTick(() => {
    document.title = to.name ? `elasticvue | ${to.name}` : 'elasticvue'
  })
})

export default router
