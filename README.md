## Badges

![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

[![Docker Pulls](https://img.shields.io/docker/pulls/hidayat30/api?style=for-the-badge)](https://hub.docker.com/r/hidayat30/api)
[![Docker Image Size](https://img.shields.io/docker/image-size/hidayat30/api/latest?style=for-the-badge)](https://hub.docker.com/r/hidayat30/api)
[![Docker Pulls](https://img.shields.io/docker/pulls/hidayat30/frontend?style=for-the-badge)](https://hub.docker.com/r/hidayat30/frontend)
[![Docker Image Size](https://img.shields.io/docker/image-size/hidayat30/frontend/latest?style=for-the-badge)](https://hub.docker.com/r/hidayat30/frontend)

# microservice
3-tier microservices demo on Kubernetes (React + Node.js + PostgreSQL) with Ingress, HPA, and zero-downtime rolling updates.

## Kubernetes Microservices Demo (kubeadm v1.32 + Flannel CNI)

## 1. Build & Push / Import Image

Ganti `YOUR_DOCKERHUB` dengan akun DockerHub kamu di `k8s/02-api.yaml` dan `k8s/03-frontend.yaml`:

```bash
export REGISTRY=YOUR_DOCKERHUB

docker build -t $REGISTRY/api:1.0 ./api
docker build -t $REGISTRY/frontend:1.0 ./frontend

# Opsi A: Push ke DockerHub
docker push $REGISTRY/api:1.0
docker push $REGISTRY/frontend:1.0

# Opsi B: Import langsung ke containerd lokal (single-node tanpa push)
docker save $REGISTRY/api:1.0 | sudo ctr -n k8s.io images import -
docker save $REGISTRY/frontend:1.0 | sudo ctr -n k8s.io images import -
```

## 2. Install Ingress-NGINX & Metrics Server

### Ingress-NGINX (Bare-metal / NodePort)
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/baremetal/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

### Metrics Server (dengan patch `--kubelet-insecure-tls`)
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

## 3. Apply Manifest Kubernetes

Before applying the manifests, replace `REPLACE_WITH_A_SECURE_PASSWORD` in
`k8s/01-postgres.yaml` and `k8s/02-api.yaml` with the same strong password.
Do not commit real credentials to the repository.

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/00-storage.yaml
kubectl apply -f k8s/01-postgres.yaml
kubectl wait -n demo --for=condition=ready pod -l app=postgres --timeout=90s
kubectl apply -f k8s/02-api.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl apply -f k8s/04-ingress.yaml
kubectl apply -f k8s/05-hpa.yaml

kubectl get all,pvc,ingress,hpa -n demo
```

## 4. Cara Akses Aplikasi

### A. Via Port-Forward
```bash
# Akses Frontend (otomatis proxy /api ke service api)
kubectl port-forward -n demo svc/frontend 8080:80
# Buka http://localhost:8080

# Atau akses API langsung
kubectl port-forward -n demo svc/api 3000:3000
curl http://localhost:3000/healthz
curl http://localhost:3000/api/visits
```

### B. Via Ingress (`demo.local`)
```bash
# Tambahkan ke /etc/hosts
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "$NODE_IP demo.local" | sudo tee -a /etc/hosts

# Ambil NodePort dari ingress-nginx-controller
INGRESS_PORT=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')

curl http://demo.local:$INGRESS_PORT/api/visits
# Buka di browser: http://demo.local:$INGRESS_PORT
```

## 5. Test HPA (Horizontal Pod Autoscaler)

```bash
# Terminal 1: Pantau HPA dan pod
kubectl get hpa -n demo -w

# Terminal 2: Generate load ke endpoint API
kubectl run -n demo load-generator --rm -i --tty --image=busybox:1.36 -- /bin/sh -c "while true; do wget -q -O- http://api:3000/api/visits; done"
```

## 6. Test Rolling Update & Rollback

```bash
# Build & update ke versi 1.1
docker build -t $REGISTRY/api:1.1 ./api
docker push $REGISTRY/api:1.1

kubectl set image deployment/api api=$REGISTRY/api:1.1 -n demo
kubectl rollout status deployment/api -n demo

# Rollback jika diperlukan
kubectl rollout undo deployment/api -n demo
```
